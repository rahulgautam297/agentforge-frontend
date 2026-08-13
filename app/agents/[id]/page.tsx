import Link from "next/link";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Agent Detail
      </h1>
      <p className="mt-2 text-[var(--muted)]">Coming in a later phase.</p>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Looking for executions and traces for this agent? See{" "}
        <Link href={`/agents/${id}/executions`}>/agents/{id}/executions</Link>
        .
      </p>
    </div>
  );
}
