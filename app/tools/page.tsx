"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { controlPlane } from "@/lib/api/controlPlane";

function parseOptionalJson(raw: string): object | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return JSON.parse(trimmed) as object;
}

export default function ToolsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tools"],
    queryFn: () => controlPlane.listTools(),
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inputSchema, setInputSchema] = useState("");
  const [outputSchema, setOutputSchema] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      let parsedInputSchema: object | undefined;
      let parsedOutputSchema: object | undefined;
      try {
        parsedInputSchema = parseOptionalJson(inputSchema);
      } catch {
        throw new Error("Input schema must be valid JSON.");
      }
      try {
        parsedOutputSchema = parseOptionalJson(outputSchema);
      } catch {
        throw new Error("Output schema must be valid JSON.");
      }
      return controlPlane.createTool({
        name,
        description: description.trim() || undefined,
        input_schema: parsedInputSchema,
        output_schema: parsedOutputSchema,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      setName("");
      setDescription("");
      setInputSchema("");
      setOutputSchema("");
      setFormError(null);
      setShowForm(false);
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : String(err));
    },
  });

  const canSubmit = name.trim().length > 0;

  const handleSubmit = () => {
    setFormError(null);
    if (!canSubmit) {
      setFormError("Name is required.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Tools
        </h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black no-underline hover:opacity-90"
        >
          {showForm ? "Cancel" : "New Tool"}
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            New Tool
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">Name</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="github"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">Description</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this tool do?"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">
                Input Schema (JSON, optional)
              </span>
              <textarea
                className="h-28 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={inputSchema}
                onChange={(e) => setInputSchema(e.target.value)}
                placeholder='{"type": "object", "properties": {}}'
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">
                Output Schema (JSON, optional)
              </span>
              <textarea
                className="h-28 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={outputSchema}
                onChange={(e) => setOutputSchema(e.target.value)}
                placeholder='{"type": "object", "properties": {}}'
              />
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
              {createMutation.isPending ? "Creating..." : "Create Tool"}
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <p className="mt-6 text-[var(--muted)]">Loading tools...</p>
      )}

      {isError && (
        <p className="mt-6 text-[var(--danger)]">
          Failed to load tools: {(error as Error).message}
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="mt-6 text-[var(--muted)]">
          No tools yet. Create one to get started.
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((tool) => (
                <tr
                  key={tool.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs text-[var(--foreground)]">
                    {tool.name}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {tool.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(tool.created_at).toLocaleString()}
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
