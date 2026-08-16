"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { controlPlane } from "@/lib/api/controlPlane";
import type { Document, KnowledgeBase } from "@/lib/api/types";

const STATUS_STYLES: Record<string, string> = {
  ready: "bg-[var(--success)]/15 text-[var(--success)]",
  indexed: "bg-[var(--success)]/15 text-[var(--success)]",
};

function statusBadgeClass(status: string): string {
  return STATUS_STYLES[status] ?? "bg-white/10 text-[var(--muted)]";
}

function DocumentsPanel({ knowledgeBase }: { knowledgeBase: KnowledgeBase }) {
  const queryClient = useQueryClient();
  const documentsQueryKey = ["knowledge", knowledgeBase.id, "documents"];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: documentsQueryKey,
    queryFn: () => controlPlane.listDocuments(knowledgeBase.id),
  });

  const [showForm, setShowForm] = useState(false);
  const [sourceUri, setSourceUri] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      controlPlane.createDocument(knowledgeBase.id, {
        source_uri: sourceUri.trim(),
        title: title.trim() || undefined,
        content,
      }),
    onSuccess: () => {
      setSourceUri("");
      setTitle("");
      setContent("");
      setFormError(null);
      setShowForm(false);
    },
    onError: (err) => {
      // Ingestion can fail server-side after the document row is already
      // persisted (it just stays un-indexed), so refresh the list below
      // even on error instead of hiding a document that may now exist.
      setFormError(
        `${err instanceof Error ? err.message : String(err)} (check the list below — the document may have been saved but left un-indexed)`,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: documentsQueryKey });
    },
  });

  const canSubmit = sourceUri.trim().length > 0 && content.trim().length > 0;

  const handleSubmit = () => {
    setFormError(null);
    if (!sourceUri.trim()) {
      setFormError("Source URI is required.");
      return;
    }
    if (!content.trim()) {
      setFormError("Content is required.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface)]/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--muted)]">Documents</h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-white/5"
        >
          {showForm ? "Cancel" : "Add Document"}
        </button>
      </div>

      {showForm && (
        <div className="mt-3 rounded-lg border border-[var(--border)] p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">Source URI</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={sourceUri}
                onChange={(e) => setSourceUri(e.target.value)}
                placeholder="docs/onboarding.md"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">Title (optional)</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Onboarding Guide"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-[var(--muted)]">
                Content (plain text)
              </span>
              <textarea
                className="h-32 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste or type the document text here (stands in for a real file upload)."
              />
            </label>
          </div>

          {formError && (
            <p className="mt-3 text-sm text-[var(--danger)]">{formError}</p>
          )}

          {createMutation.isPending && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Ingesting document — chunking and indexing can take a few
              seconds for longer content...
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || createMutation.isPending}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? "Ingesting..." : "Add Document"}
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Loading documents...
        </p>
      )}

      {isError && (
        <p className="mt-4 text-sm text-[var(--danger)]">
          Failed to load documents: {(error as Error).message}
        </p>
      )}

      {data && data.length === 0 && (
        <p className="mt-4 text-sm text-[var(--muted)]">
          No documents yet. Add one to get started.
        </p>
      )}

      {data && data.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Title / Source</th>
                <th className="px-4 py-3 font-medium">Chunks</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((doc: Document) => (
                <tr
                  key={doc.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    <div className="font-medium">
                      {doc.title ?? doc.source_uri}
                    </div>
                    {doc.title && (
                      <div className="font-mono text-xs text-[var(--muted)]">
                        {doc.source_uri}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {doc.chunk_count ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        doc.indexed_at
                          ? "bg-[var(--success)]/15 text-[var(--success)]"
                          : "bg-white/10 text-[var(--muted)]"
                      }`}
                    >
                      {doc.indexed_at ? "Indexed" : "Pending"}
                    </span>
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

export default function KnowledgePage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["knowledge"],
    queryFn: () => controlPlane.listKnowledgeBases(),
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      controlPlane.createKnowledgeBase({
        name: name.trim(),
        source_type: sourceType.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setName("");
      setSourceType("");
      setFormError(null);
      setShowForm(false);
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : String(err));
    },
  });

  const canSubmit = name.trim().length > 0 && sourceType.trim().length > 0;

  const handleSubmit = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!sourceType.trim()) {
      setFormError("Source type is required.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Knowledge
        </h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black no-underline hover:opacity-90"
        >
          {showForm ? "Cancel" : "New Knowledge Base"}
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            New Knowledge Base
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">Name</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="engineering-docs"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--muted)]">Source Type</span>
              <input
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                placeholder="manual, s3, confluence, ..."
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
              {createMutation.isPending ? "Creating..." : "Create Knowledge Base"}
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <p className="mt-6 text-[var(--muted)]">Loading knowledge bases...</p>
      )}

      {isError && (
        <p className="mt-6 text-[var(--danger)]">
          Failed to load knowledge bases: {(error as Error).message}
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="mt-6 text-[var(--muted)]">
          No knowledge bases yet. Create one to get started.
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          {data.items.map((kb) => {
            const expanded = selectedId === kb.id;
            return (
              <div
                key={kb.id}
                className="overflow-hidden rounded-lg border border-[var(--border)]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedId((current) =>
                      current === kb.id ? null : kb.id,
                    )
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/5"
                >
                  <div>
                    <div className="font-mono text-sm text-[var(--foreground)]">
                      {kb.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                      <span>{kb.source_type}</span>
                      <span>·</span>
                      <span>
                        Created {new Date(kb.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(
                        kb.status,
                      )}`}
                    >
                      {kb.status}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {expanded ? "Hide documents" : "Show documents"}
                    </span>
                  </div>
                </button>

                {expanded && <DocumentsPanel knowledgeBase={kb} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
