"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { controlPlane } from "@/lib/api/controlPlane";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-[var(--success)]/15 text-[var(--success)]",
  draft: "bg-white/10 text-[var(--muted)]",
};

export default function AgentsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["agents"],
    queryFn: () => controlPlane.listAgents(),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Agents
        </h1>
        <Link
          href="/agents/new"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black no-underline hover:opacity-90"
        >
          New Agent
        </Link>
      </div>

      {isLoading && (
        <p className="mt-6 text-[var(--muted)]">Loading agents...</p>
      )}

      {isError && (
        <p className="mt-6 text-[var(--danger)]">
          Failed to load agents: {(error as Error).message}
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="mt-6 text-[var(--muted)]">
          No agents yet. Create one to get started.
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Display Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Latest Version</th>
                <th className="px-4 py-3 font-medium">Executions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((agent) => (
                <tr
                  key={agent.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs text-[var(--foreground)]">
                    {agent.slug}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {agent.display_name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        STATUS_STYLES[agent.status] ??
                        "bg-white/10 text-[var(--muted)]"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">
                    {agent.latest_version_id ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/agents/${agent.id}/executions`}>
                      View executions
                    </Link>
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
