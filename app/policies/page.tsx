"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { controlPlane } from "@/lib/api/controlPlane";
import type { PolicyRule } from "@/lib/api/types";

const ACTIONS: PolicyRule["action"][] = ["read", "write", "execute", "*"];
const EFFECTS: PolicyRule["effect"][] = ["allow", "deny", "human_approval"];

const EFFECT_STYLES: Record<string, string> = {
  allow: "bg-[var(--success)]/15 text-[var(--success)]",
  deny: "bg-[var(--danger)]/15 text-[var(--danger)]",
  human_approval: "bg-white/10 text-[var(--muted)]",
};

function formatRule(rule: PolicyRule): string {
  const base = `${rule.tool_id} · ${rule.action} · ${rule.effect}`;
  return rule.resource_pattern
    ? `${base} · ${rule.resource_pattern}`
    : base;
}

export default function PoliciesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["policies"],
    queryFn: () => controlPlane.listPolicies(),
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [toolId, setToolId] = useState("");
  const [action, setAction] = useState<PolicyRule["action"]>("read");
  const [resourcePattern, setResourcePattern] = useState("");
  const [effect, setEffect] = useState<PolicyRule["effect"]>("allow");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      const rule: PolicyRule = {
        tool_id: toolId.trim(),
        action,
        effect,
        ...(resourcePattern.trim()
          ? { resource_pattern: resourcePattern.trim() }
          : {}),
      };
      return controlPlane.createPolicy({ name: name.trim(), rule });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      setName("");
      setToolId("");
      setAction("read");
      setResourcePattern("");
      setEffect("allow");
      setFormError(null);
      setShowForm(false);
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : String(err));
    },
  });

  const canSubmit = name.trim().length > 0 && toolId.trim().length > 0;

  const handleSubmit = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!toolId.trim()) {
      setFormError("Tool ID is required (use \"*\" for any tool).");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Policies
        </h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black no-underline hover:opacity-90"
        >
          {showForm ? "Cancel" : "New Policy"}
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            New Policy
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">Name</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="production-read-only"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">Tool ID</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={toolId}
                onChange={(e) => setToolId(e.target.value)}
                placeholder="github or *"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">Action</span>
              <select
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={action}
                onChange={(e) =>
                  setAction(e.target.value as PolicyRule["action"])
                }
              >
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">
                Resource Pattern (optional)
              </span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={resourcePattern}
                onChange={(e) => setResourcePattern(e.target.value)}
                placeholder="production/*"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">Effect</span>
              <select
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={effect}
                onChange={(e) =>
                  setEffect(e.target.value as PolicyRule["effect"])
                }
              >
                {EFFECTS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {formError && (
            <p className="mt-3 text-sm text-[var(--danger)]">{formError}</p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || createMutation.isPending}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Policy"}
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <p className="mt-6 text-[var(--muted)]">Loading policies...</p>
      )}

      {isError && (
        <p className="mt-6 text-[var(--danger)]">
          Failed to load policies: {(error as Error).message}
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="mt-6 text-[var(--muted)]">
          No policies yet. Create one to get started.
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Rule</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((policy) => (
                <tr
                  key={policy.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs text-[var(--foreground)]">
                    {policy.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        EFFECT_STYLES[policy.rule.effect] ??
                        "bg-white/10 text-[var(--muted)]"
                      }`}
                    >
                      {formatRule(policy.rule)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(policy.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
