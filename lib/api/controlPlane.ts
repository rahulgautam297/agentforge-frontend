import { apiFetch } from "./http";
import type {
  Agent,
  AgentVersion,
  Deployment,
  Document,
  KnowledgeBase,
  PaginatedAgents,
  PaginatedKnowledgeBases,
  PaginatedPolicies,
  PaginatedTools,
  Policy,
  PolicyRule,
  Tool,
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

  listTools: () => apiFetch<PaginatedTools>(BASE_URL, "/tools"),

  createTool: (input: {
    name: string;
    description?: string;
    input_schema?: object;
    output_schema?: object;
  }) =>
    apiFetch<Tool>(BASE_URL, "/tools", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getTool: (id: string) => apiFetch<Tool>(BASE_URL, `/tools/${id}`),

  listPolicies: () => apiFetch<PaginatedPolicies>(BASE_URL, "/policies"),

  createPolicy: (input: { name: string; rule: PolicyRule }) =>
    apiFetch<Policy>(BASE_URL, "/policies", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getPolicy: (id: string) => apiFetch<Policy>(BASE_URL, `/policies/${id}`),

  updatePolicy: (id: string, input: { name?: string; rule?: PolicyRule }) =>
    apiFetch<Policy>(BASE_URL, `/policies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  listKnowledgeBases: () =>
    apiFetch<PaginatedKnowledgeBases>(BASE_URL, "/knowledge"),

  createKnowledgeBase: (input: { name: string; source_type: string }) =>
    apiFetch<KnowledgeBase>(BASE_URL, "/knowledge", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getKnowledgeBase: (id: string) =>
    apiFetch<KnowledgeBase>(BASE_URL, `/knowledge/${id}`),

  listDocuments: (knowledgeBaseId: string) =>
    apiFetch<Document[]>(BASE_URL, `/knowledge/${knowledgeBaseId}/documents`),

  createDocument: (
    knowledgeBaseId: string,
    input: { source_uri: string; title?: string; content: string },
  ) =>
    apiFetch<Document>(
      BASE_URL,
      `/knowledge/${knowledgeBaseId}/documents`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
};
