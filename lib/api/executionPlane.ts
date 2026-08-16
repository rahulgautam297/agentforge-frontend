import { apiFetch } from "./http";
import type { Approval, Execution, ExecutionTrace } from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_EXECUTION_PLANE_URL ??
  "http://localhost:8001/api/v1";

export const executionPlane = {
  listExecutions: (agentId: string) =>
    apiFetch<Execution[]>(BASE_URL, `/agents/${agentId}/executions`),

  getExecution: (id: string) =>
    apiFetch<Execution>(BASE_URL, `/executions/${id}`),

  triggerExecution: (
    agentId: string,
    message: string,
    idempotencyKey: string,
  ) =>
    apiFetch<Execution>(BASE_URL, `/agents/${agentId}/executions`, {
      method: "POST",
      idempotencyKey,
      body: JSON.stringify({ input: { message } }),
    }),

  getTrace: (executionId: string) =>
    apiFetch<ExecutionTrace>(BASE_URL, `/executions/${executionId}/trace`),

  listApprovals: () => apiFetch<Approval[]>(BASE_URL, "/approvals"),

  getApproval: (id: string) => apiFetch<Approval>(BASE_URL, `/approvals/${id}`),

  decideApproval: (
    id: string,
    decision: "approve" | "reject",
    comment?: string,
  ) =>
    apiFetch<Approval>(BASE_URL, `/approvals/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, comment }),
    }),
};
