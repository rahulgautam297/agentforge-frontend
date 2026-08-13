// Shared types mirroring confirmed response shapes from the control-plane
// (port 8000) and execution-platform (port 8001) services.

export interface Agent {
  id: string;
  tenant_id: string;
  slug: string;
  display_name: string;
  description: string | null;
  owner_user_id: string;
  latest_version_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedAgents {
  items: Agent[];
  next_cursor: string | null;
}

export interface ValidationError {
  code: string;
  message: string;
  field: string | null;
}

export interface ValidationResult {
  valid: boolean;
  schema_version: string | null;
  errors: ValidationError[];
}

export interface AgentVersion {
  id: string;
  agent_id: string;
  version: string;
  yaml_source: string;
  schema_version: string | null;
  validated_at: string | null;
  validation_status: string;
  validation_errors: ValidationError[] | null;
  created_by: string;
  created_at: string;
}

export interface Deployment {
  id: string;
  agent_version_id: string;
  environment: string;
  status: string;
  idempotency_key: string;
  deployed_by: string;
  deployed_at: string;
  rolled_back_at: string | null;
}

export interface Execution {
  id: string;
  deployment_id: string;
  agent_version_id: string;
  tenant_id: string;
  mode: string;
  status: string;
  input: Record<string, unknown>;
  output: { text: string } | null;
  idempotency_key: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface ModelCall {
  id: string;
  provider: string;
  model_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  cost_usd: number | null;
  created_at: string;
}

export interface TraceStep {
  id: string;
  step_type: string;
  node_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  model_calls: ModelCall[];
  tool_calls: unknown[];
  children: TraceStep[];
}

export interface ExecutionTrace {
  execution_id: string;
  status: string;
  steps: TraceStep[];
}

export const TERMINAL_EXECUTION_STATUSES = new Set([
  "completed",
  "failed",
  "cancelled",
]);
