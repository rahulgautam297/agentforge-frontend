"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { executionPlane } from "@/lib/api/executionPlane";
import { TERMINAL_EXECUTION_STATUSES, type TraceStep } from "@/lib/api/types";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-[var(--success)]/15 text-[var(--success)]",
  failed: "bg-[var(--danger)]/15 text-[var(--danger)]",
  running: "bg-[var(--accent)]/15 text-[var(--accent)]",
  pending: "bg-white/10 text-[var(--muted)]",
};

function statusClass(status: string): string {
  return STATUS_STYLES[status] ?? "bg-white/10 text-[var(--muted)]";
}

function durationMs(started: string, ended: string | null): string {
  if (!ended) return "—";
  const ms = new Date(ended).getTime() - new Date(started).getTime();
  return `${ms}ms`;
}

function TraceStepView({ step }: { step: TraceStep }) {
  return (
    <li className="rounded-md border border-[var(--border)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-[var(--foreground)]">
          {step.node_id}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(step.status)}`}>
          {step.status}
        </span>
        <span className="text-xs text-[var(--muted)]">{step.step_type}</span>
        <span className="text-xs text-[var(--muted)]">
          {durationMs(step.started_at, step.ended_at)}
        </span>
      </div>

      {step.model_calls.length > 0 && (
        <ul className="mt-2 space-y-1">
          {step.model_calls.map((call) => (
            <li
              key={call.id}
              className="rounded bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]"
            >
              <span className="font-mono text-[var(--foreground)]">
                {call.model_id}
              </span>{" "}
              ({call.provider}) · prompt {call.prompt_tokens}tok · completion{" "}
              {call.completion_tokens}tok · {call.latency_ms}ms
            </li>
          ))}
        </ul>
      )}

      {step.children.length > 0 && (
        <ul className="mt-2 space-y-2 pl-4">
          {step.children.map((child) => (
            <TraceStepView key={child.id} step={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function AgentExecutionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: agentId } = use(params);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("Hello AgentForge");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<
    string | null
  >(null);

  const executionsQuery = useQuery({
    queryKey: ["executions", agentId],
    queryFn: () => executionPlane.listExecutions(agentId),
    refetchInterval: (query) => {
      const executions = query.state.data;
      if (!executions) return false;
      const hasNonTerminal = executions.some(
        (execution) => !TERMINAL_EXECUTION_STATUSES.has(execution.status),
      );
      return hasNonTerminal ? 2000 : false;
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const key = crypto.randomUUID();
      setPendingKey(key);
      return executionPlane.triggerExecution(agentId, message, key);
    },
    onSuccess: (execution) => {
      setSelectedExecutionId(execution.id);
      queryClient.invalidateQueries({ queryKey: ["executions", agentId] });
    },
    onSettled: () => setPendingKey(null),
  });

  const traceQuery = useQuery({
    queryKey: ["trace", selectedExecutionId],
    queryFn: () => executionPlane.getTrace(selectedExecutionId as string),
    enabled: Boolean(selectedExecutionId),
  });

  const executions = executionsQuery.data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Executions
      </h1>
      <p className="mt-1 font-mono text-xs text-[var(--muted)]">{agentId}</p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-1 min-w-[240px] flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Message</span>
          <input
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => runMutation.mutate()}
          disabled={Boolean(pendingKey) || runMutation.isPending}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
        >
          {runMutation.isPending ? "Running..." : "Run"}
        </button>
      </div>
      {runMutation.isError && (
        <p className="mt-2 text-sm text-[var(--danger)]">
          Run failed: {(runMutation.error as Error).message}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium text-[var(--muted)]">
            Past Executions
          </h2>
          {executionsQuery.isLoading && (
            <p className="mt-3 text-sm text-[var(--muted)]">Loading...</p>
          )}
          {executionsQuery.isError && (
            <p className="mt-3 text-sm text-[var(--danger)]">
              Failed to load executions:{" "}
              {(executionsQuery.error as Error).message}
            </p>
          )}
          {executions.length === 0 && !executionsQuery.isLoading && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              No executions yet. Run the agent to create one.
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {executions.map((execution) => (
              <li key={execution.id}>
                <button
                  type="button"
                  onClick={() => setSelectedExecutionId(execution.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    selectedExecutionId === execution.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--border)] hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-[var(--foreground)]">
                      {execution.id.slice(0, 8)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${statusClass(execution.status)}`}
                    >
                      {execution.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--muted)]">
                    {typeof execution.input?.message === "string"
                      ? execution.input.message
                      : JSON.stringify(execution.input)}
                  </p>
                  {execution.output?.text && (
                    <p className="mt-1 truncate text-xs text-[var(--foreground)]">
                      → {execution.output.text}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-medium text-[var(--muted)]">Trace</h2>
          {!selectedExecutionId && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Select an execution to view its trace.
            </p>
          )}
          {selectedExecutionId && traceQuery.isLoading && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Loading trace...
            </p>
          )}
          {selectedExecutionId && traceQuery.isError && (
            <p className="mt-3 text-sm text-[var(--danger)]">
              Failed to load trace: {(traceQuery.error as Error).message}
            </p>
          )}
          {traceQuery.data && (
            <ul className="mt-3 space-y-2">
              {traceQuery.data.steps.map((step) => (
                <TraceStepView key={step.id} step={step} />
              ))}
              {traceQuery.data.steps.length === 0 && (
                <p className="text-sm text-[var(--muted)]">
                  No steps recorded for this execution.
                </p>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
