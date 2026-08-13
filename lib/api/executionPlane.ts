import { apiFetch } from "./http";
import type { Execution, ExecutionTrace } from "./types";

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
};
