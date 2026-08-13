import { apiFetch } from "./http";
import type {
  Agent,
  AgentVersion,
  Deployment,
  PaginatedAgents,
  ValidationResult,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_CONTROL_PLANE_URL ?? "http://localhost:8000/api/v1";

export const controlPlane = {
  listAgents: () => apiFetch<PaginatedAgents>(BASE_URL, "/agents"),

  getAgent: (id: string) => apiFetch<Agent>(BASE_URL, `/agents/${id}`),

  createAgent: (input: {
    slug: string;
    display_name: string;
    description: string;
  }) =>
    apiFetch<Agent>(BASE_URL, "/agents", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  validateYaml: (yamlSource: string) =>
    apiFetch<ValidationResult>(BASE_URL, "/agents/validate", {
      method: "POST",
      body: JSON.stringify({ yaml_source: yamlSource }),
    }),

  validateAgentYaml: (agentId: string, yamlSource: string) =>
    apiFetch<ValidationResult>(BASE_URL, `/agents/${agentId}/validate`, {
      method: "POST",
      body: JSON.stringify({ yaml_source: yamlSource }),
    }),

  listVersions: (agentId: string) =>
    apiFetch<AgentVersion[]>(BASE_URL, `/agents/${agentId}/versions`),

  createVersion: (agentId: string, yamlSource: string) =>
    apiFetch<AgentVersion>(BASE_URL, `/agents/${agentId}/versions`, {
      method: "POST",
      body: JSON.stringify({ yaml_source: yamlSource }),
    }),

  listDeployments: (agentId: string) =>
    apiFetch<Deployment[]>(BASE_URL, `/agents/${agentId}/deployments`),

  deploy: (
    agentId: string,
    agentVersionId: string,
    idempotencyKey: string,
    environment = "local",
  ) =>
    apiFetch<Deployment>(BASE_URL, `/agents/${agentId}/deploy`, {
      method: "POST",
      idempotencyKey,
      body: JSON.stringify({
        agent_version_id: agentVersionId,
        environment,
      }),
    }),
};
