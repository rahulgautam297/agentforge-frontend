"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import * as yaml from "js-yaml";
import { controlPlane } from "@/lib/api/controlPlane";
import type { ValidationResult } from "@/lib/api/types";

const DEFAULT_YAML = `schema_version: "1.0.0"

agent:
  name: my-new-agent
  display_name: My New Agent
  description: A short description of what this agent does.
  owner: your-team
  version: "0.1.0"
  tags: []

model:
  provider: mock
  model_id: mock-echo-v1
  params:
    temperature: 0.0
    max_tokens: 512

execution:
  mode: ephemeral
  timeout_seconds: 30

tools: []
`;

interface ParsedPreview {
  provider?: string;
  modelId?: string;
  executionMode?: string;
  toolCount?: number;
  parseError?: string;
}

function parseYamlPreview(source: string): ParsedPreview {
  try {
    const doc = yaml.load(source) as Record<string, unknown> | undefined;
    if (!doc || typeof doc !== "object") {
      return { parseError: "YAML did not parse to an object" };
    }
    const model = (doc.model ?? {}) as Record<string, unknown>;
    const execution = (doc.execution ?? {}) as Record<string, unknown>;
    const tools = Array.isArray(doc.tools) ? doc.tools : [];
    return {
      provider: typeof model.provider === "string" ? model.provider : undefined,
      modelId: typeof model.model_id === "string" ? model.model_id : undefined,
      executionMode:
        typeof execution.mode === "string" ? execution.mode : undefined,
      toolCount: tools.length,
    };
  } catch (err) {
    return { parseError: err instanceof Error ? err.message : String(err) };
  }
}

export default function NewAgentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [yamlSource, setYamlSource] = useState(DEFAULT_YAML);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [deployIdempotencyKey, setDeployIdempotencyKey] = useState<
    string | null
  >(null);

  const preview = useMemo(() => parseYamlPreview(yamlSource), [yamlSource]);

  const validateMutation = useMutation({
    mutationFn: () => controlPlane.validateYaml(yamlSource),
    onSuccess: (result) => setValidation(result),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let currentAgentId = agentId;
      if (!currentAgentId) {
        const agent = await controlPlane.createAgent({
          slug,
          display_name: displayName,
          description,
        });
        currentAgentId = agent.id;
        setAgentId(agent.id);
      }
      const version = await controlPlane.createVersion(
        currentAgentId,
        yamlSource,
      );
      setVersionId(version.id);
      if (version.validation_errors) {
        setValidation({
          valid: version.validation_status === "valid",
          schema_version: version.schema_version,
          errors: version.validation_errors,
        });
      }
      return { agentId: currentAgentId, version };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (!agentId || !versionId) {
        throw new Error("Save the agent before deploying.");
      }
      const key = crypto.randomUUID();
      setDeployIdempotencyKey(key);
      return controlPlane.deploy(agentId, versionId, key, "local");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      if (agentId) {
        router.push(`/agents/${agentId}/executions`);
      }
    },
    onSettled: () => setDeployIdempotencyKey(null),
  });

  const canSave = slug.trim().length > 0 && displayName.trim().length > 0;
  const canDeploy = Boolean(agentId && versionId) && !deployIdempotencyKey;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        New Agent
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Slug</span>
          <input
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-new-agent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Display Name</span>
          <input
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="My New Agent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--muted)]">Description</span>
          <input
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this agent do?"
          />
        </label>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--muted)]">
            agent.yaml
          </div>
          <Editor
            height="480px"
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

        <div className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            Parsed Preview
          </h2>
          {preview.parseError ? (
            <p className="mt-3 text-sm text-[var(--danger)]">
              Could not parse YAML: {preview.parseError}
            </p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Model provider</dt>
                <dd className="text-[var(--foreground)]">
                  {preview.provider ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Model ID</dt>
                <dd className="text-[var(--foreground)]">
                  {preview.modelId ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Execution mode</dt>
                <dd className="text-[var(--foreground)]">
                  {preview.executionMode ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Tools</dt>
                <dd className="text-[var(--foreground)]">
                  {preview.toolCount ?? 0}
                </dd>
              </div>
            </dl>
          )}

          <h2 className="mt-6 text-sm font-medium text-[var(--muted)]">
            Validation Result
          </h2>
          {validation ? (
            <div className="mt-3">
              <p
                className={
                  validation.valid
                    ? "text-sm text-[var(--success)]"
                    : "text-sm text-[var(--danger)]"
                }
              >
                {validation.valid
                  ? `Valid (schema ${validation.schema_version})`
                  : "Invalid"}
              </p>
              {validation.errors.length > 0 && (
                <ul className="mt-2 space-y-2 text-sm">
                  {validation.errors.map((err, idx) => (
                    <li
                      key={idx}
                      className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2"
                    >
                      <span className="font-mono text-xs text-[var(--danger)]">
                        {err.code}
                      </span>
                      {err.field && (
                        <span className="ml-2 text-xs text-[var(--muted)]">
                          field: {err.field}
                        </span>
                      )}
                      <p className="mt-1 text-[var(--foreground)]">
                        {err.message}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Run validation to see results here.
            </p>
          )}

          {agentId && (
            <p className="mt-6 text-xs text-[var(--muted)]">
              Agent created: <span className="font-mono">{agentId}</span>
              {versionId && (
                <>
                  {" "}
                  · Version saved: <span className="font-mono">{versionId}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => validateMutation.mutate()}
          disabled={validateMutation.isPending}
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-white/5 disabled:opacity-50"
        >
          {validateMutation.isPending ? "Validating..." : "Validate"}
        </button>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-white/5 disabled:opacity-50"
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => deployMutation.mutate()}
          disabled={!canDeploy || deployMutation.isPending}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
        >
          {deployMutation.isPending ? "Deploying..." : "Deploy"}
        </button>
      </div>

      {saveMutation.isError && (
        <p className="mt-3 text-sm text-[var(--danger)]">
          Save failed: {(saveMutation.error as Error).message}
        </p>
      )}
      {deployMutation.isError && (
        <p className="mt-3 text-sm text-[var(--danger)]">
          Deploy failed: {(deployMutation.error as Error).message}
        </p>
      )}
      {!agentId && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Save the agent (creates the agent + a version) before deploying.
        </p>
      )}
    </div>
  );
}
