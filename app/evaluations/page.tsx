"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import { controlPlane } from "@/lib/api/controlPlane";
import { executionPlane } from "@/lib/api/executionPlane";
import type { EvalResult, EvalRun, EvaluationSuite } from "@/lib/api/types";

const DEFAULT_SUITE_YAML = `tasks:
  - id: example-exact-match
    input: {message: "ping"}
    grading:
      kind: exact_match
      expected: "pong"
  - id: example-judge
    input: {message: "In one sentence, what is 2+2?"}
    grading:
      kind: judge
      rubric: "The response correctly states that 2+2 equals 4."
      threshold: 0.7
`;

function resultBadgeClass(passed: boolean | null): string {
  if (passed === true) return "bg-[var(--success)]/15 text-[var(--success)]";
  if (passed === false) return "bg-[var(--danger)]/15 text-[var(--danger)]";
  return "bg-white/10 text-[var(--muted)]";
}

function resultBadgeLabel(passed: boolean | null): string {
  if (passed === true) return "passed";
  if (passed === false) return "failed";
  return "ungraded";
}

function RunResultPanel({ run }: { run: EvalRun }) {
  return (
    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]/40 p-4">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-[var(--muted)]">
          Run <span className="font-mono text-xs">{run.id}</span>
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            run.status === "completed"
              ? "bg-[var(--success)]/15 text-[var(--success)]"
              : "bg-white/10 text-[var(--muted)]"
          }`}
        >
          {run.status}
        </span>
        <span className="text-[var(--foreground)]">
          {run.summary.passed}/{run.summary.total} passed
        </span>
        {run.summary.avg_score !== null && (
          <span className="text-[var(--muted)]">
            avg score {run.summary.avg_score.toFixed(3)}
          </span>
        )}
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
              <th className="px-4 py-2 font-medium">Case</th>
              <th className="px-4 py-2 font-medium">Result</th>
              <th className="px-4 py-2 font-medium">Score</th>
              <th className="px-4 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {run.results.map((result: EvalResult) => (
              <tr
                key={result.id}
                className="border-b border-[var(--border)] last:border-0 align-top"
              >
                <td className="px-4 py-2 font-mono text-xs text-[var(--foreground)]">
                  {result.case_id}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${resultBadgeClass(result.passed)}`}
                  >
                    {resultBadgeLabel(result.passed)}
                  </span>
                </td>
                <td className="px-4 py-2 text-[var(--muted)]">
                  {result.score !== null ? result.score.toFixed(3) : "—"}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-[var(--muted)]">
                  {result.details && Object.keys(result.details).length > 0
                    ? JSON.stringify(result.details)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuiteCard({ suite }: { suite: EvaluationSuite }) {
  const [agentId, setAgentId] = useState("");
  const [lastRun, setLastRun] = useState<EvalRun | null>(null);

  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: () => controlPlane.listAgents(),
  });
  const activeAgents = (agentsQuery.data?.items ?? []).filter(
    (a) => a.status === "active",
  );

  const runMutation = useMutation({
    mutationFn: () => executionPlane.triggerEvalRun(suite.id, agentId),
    onSuccess: (run) => setLastRun(run),
  });

  const taskCount = suite.config.tasks?.length ?? 0;

  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-sm text-[var(--foreground)]">
            {suite.name}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            {taskCount} task{taskCount === 1 ? "" : "s"} · created{" "}
            {new Date(suite.created_at).toLocaleString()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Select agent...</option>
            {activeAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.slug}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => runMutation.mutate()}
            disabled={!agentId || runMutation.isPending}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            {runMutation.isPending ? "Running..." : "Run"}
          </button>
        </div>
      </div>

      {runMutation.isError && (
        <p className="mt-3 text-sm text-[var(--danger)]">
          Run failed: {(runMutation.error as Error).message}
        </p>
      )}

      {lastRun && <RunResultPanel run={lastRun} />}
    </div>
  );
}

export default function EvaluationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["evaluations"],
    queryFn: () => controlPlane.listEvaluationSuites(),
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [yamlSource, setYamlSource] = useState(DEFAULT_SUITE_YAML);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      controlPlane.createEvaluationSuite({
        name: name.trim(),
        yaml_source: yamlSource,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      setName("");
      setYamlSource(DEFAULT_SUITE_YAML);
      setFormError(null);
      setShowForm(false);
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : String(err));
    },
  });

  const canSubmit = name.trim().length > 0 && yamlSource.trim().length > 0;

  const handleSubmit = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Evaluations
        </h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black no-underline hover:opacity-90"
        >
          {showForm ? "Cancel" : "New Suite"}
        </button>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Run a suite headlessly against any active agent — exact-match,
        LLM-judge, and unit-test grading, plus Ragas-style faithfulness /
        answer-relevancy / context metrics for RAG-backed agents.
      </p>

      {showForm && (
        <div className="mt-6 rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            New Evaluation Suite
          </h2>
          <label className="mt-4 flex flex-col gap-1 text-sm sm:w-1/2">
            <span className="text-[var(--muted)]">Name</span>
            <input
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="knowledge-agent-baseline"
            />
          </label>

          <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
            <div className="border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--muted)]">
              suite.yaml
            </div>
            <Editor
              height="320px"
              defaultLanguage="yaml"
              theme="vs-dark"
              value={yamlSource}
              onChange={(value) => setYamlSource(value ?? "")}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
              }}
            />
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
              {createMutation.isPending ? "Creating..." : "Create Suite"}
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <p className="mt-6 text-[var(--muted)]">Loading evaluation suites...</p>
      )}

      {isError && (
        <p className="mt-6 text-[var(--danger)]">
          Failed to load evaluation suites: {(error as Error).message}
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="mt-6 text-[var(--muted)]">
          No evaluation suites yet. Create one to get started.
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {data.items.map((suite) => (
            <SuiteCard key={suite.id} suite={suite} />
          ))}
        </div>
      )}
    </div>
  );
}
