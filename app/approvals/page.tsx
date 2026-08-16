"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { executionPlane } from "@/lib/api/executionPlane";
import type { Approval } from "@/lib/api/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[var(--accent)]/15 text-[var(--accent)]",
  approved: "bg-[var(--success)]/15 text-[var(--success)]",
  rejected: "bg-[var(--danger)]/15 text-[var(--danger)]",
};

function statusClass(status: string): string {
  return STATUS_STYLES[status] ?? "bg-white/10 text-[var(--muted)]";
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function ApprovalCard({ approval }: { approval: Approval }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const decideMutation = useMutation({
    mutationFn: (decision: "approve" | "reject") =>
      executionPlane.decideApproval(
        approval.id,
        decision,
        comment.trim() || undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });

  const isPending = approval.status === "pending";

  return (
    <li className="rounded-lg border border-[var(--border)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            {approval.agent_display_name}
          </span>
          <span className="font-mono text-xs text-[var(--muted)]">
            {approval.tool_name}
          </span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${statusClass(approval.status)}`}
        >
          {approval.status}
        </span>
      </div>

      <p className="mt-2 text-sm text-[var(--foreground)]">
        {approval.reason}
      </p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        <span>Requested {formatTimestamp(approval.requested_at)}</span>
        {isPending && approval.timeout_at && (
          <span>Times out {formatTimestamp(approval.timeout_at)}</span>
        )}
        <span className="font-mono">execution {approval.execution_id.slice(0, 8)}</span>
      </div>

      {isPending ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            placeholder="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            type="button"
            onClick={() => decideMutation.mutate("approve")}
            disabled={decideMutation.isPending}
            className="rounded-md bg-[var(--success)] px-3 py-1.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => decideMutation.mutate("reject")}
            disabled={decideMutation.isPending}
            className="rounded-md bg-[var(--danger)] px-3 py-1.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-0.5 text-xs text-[var(--muted)]">
          <p>Decided {formatTimestamp(approval.decided_at)}</p>
          {approval.approver_user_id && <p>By {approval.approver_user_id}</p>}
          {approval.comment && <p>&ldquo;{approval.comment}&rdquo;</p>}
        </div>
      )}

      {decideMutation.isError && (
        <p className="mt-2 text-sm text-[var(--danger)]">
          Decision failed: {(decideMutation.error as Error).message}
        </p>
      )}
    </li>
  );
}

export default function ApprovalsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => executionPlane.listApprovals(),
    refetchInterval: (query) => {
      const approvals = query.state.data;
      if (!approvals) return false;
      const hasPending = approvals.some((a) => a.status === "pending");
      return hasPending ? 2000 : false;
    },
  });

  const approvals = data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Approvals
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Actions paused for a human decision, plus history of past decisions.
      </p>

      {isLoading && (
        <p className="mt-6 text-[var(--muted)]">Loading approvals...</p>
      )}

      {isError && (
        <p className="mt-6 text-[var(--danger)]">
          Failed to load approvals: {(error as Error).message}
        </p>
      )}

      {!isLoading && !isError && approvals.length === 0 && (
        <p className="mt-6 text-[var(--muted)]">No approvals yet.</p>
      )}

      {approvals.length > 0 && (
        <ul className="mt-6 space-y-3">
          {approvals.map((approval) => (
            <ApprovalCard key={approval.id} approval={approval} />
          ))}
        </ul>
      )}
    </div>
  );
}
