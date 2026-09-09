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

export interface ToolCall {
  id: string;
  tool_id: string;
  permission_used: string;
  request: Record<string, unknown>;
  response: Record<string, unknown> | null;
  latency_ms: number | null;
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
  tool_calls: ToolCall[];
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

export interface Tool {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  input_schema: Record<string, unknown> | null;
  output_schema: Record<string, unknown> | null;
  created_at: string;
}

export interface PaginatedTools {
  items: Tool[];
  next_cursor: string | null;
}

export interface PolicyRule {
  tool_id: string;
  action: "read" | "write" | "execute" | "*";
  resource_pattern?: string;
  effect: "allow" | "deny" | "human_approval";
}

export interface Policy {
  id: string;
  tenant_id: string;
  name: string;
  rule: PolicyRule;
  created_by: string | null;
  created_at: string;
}

export interface PaginatedPolicies {
  items: Policy[];
  next_cursor: string | null;
}

export interface KnowledgeBase {
  id: string;
  tenant_id: string;
  name: string;
  source_type: string;
  status: string;
  created_at: string;
}

export interface PaginatedKnowledgeBases {
  items: KnowledgeBase[];
  next_cursor: string | null;
}

export interface Document {
  id: string;
  knowledge_base_id: string;
  source_uri: string;
  title: string | null;
  checksum: string;
  indexed_at: string | null;
  chunk_count: number | null;
}

export interface EvalTaskGrading {
  kind: "exact_match" | "judge" | "unit_test";
  expected?: string;
  case_sensitive?: boolean;
  rubric?: string;
  ground_truth?: string;
  threshold?: number;
  script?: string;
}

export interface EvalTask {
  id: string;
  input: Record<string, unknown>;
  grading: EvalTaskGrading;
}

export interface EvaluationSuiteConfig {
  tasks: EvalTask[];
  judge?: { provider?: string; model_id?: string };
}

export interface EvaluationSuite {
  id: string;
  tenant_id: string;
  name: string;
  config: EvaluationSuiteConfig;
  created_at: string;
}

export interface PaginatedEvaluationSuites {
  items: EvaluationSuite[];
}

export interface EvalResult {
  id: string;
  execution_id: string | null;
  case_id: string;
  score: number | null;
  passed: boolean | null;
  details: Record<string, unknown> | null;
}

export interface EvalRunSummary {
  total: number;
  passed: number;
  failed: number;
  avg_score: number | null;
}

export interface EvalRun {
  id: string;
  evaluation_suite_id: string;
  agent_version_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  results: EvalResult[];
  summary: EvalRunSummary;
}

export interface Approval {
  id: string;
  execution_id: string;
  status: string;
  requested_at: string;
  decided_at: string | null;
  approver_user_id: string | null;
  comment: string | null;
  timeout_at: string | null;
  tool_name: string;
  reason: string;
  agent_display_name: string;
}
