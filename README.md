# agentforge-frontend

**Status:** Not yet implemented — see `../agentforge-docs/docs/architecture/12-implementation-plan.md`, Phase 1.

## Purpose

This repo will host the AgentForge developer portal: a Next.js + TypeScript
+ Tailwind CSS application with a Monaco-based YAML editor and React Query
for data fetching. It owns every developer-facing page — `/dashboard`,
`/agents`, `/agents/new`, `/agents/:id`, `/agents/:id/executions`,
`/knowledge`, `/tools`, `/models`, `/evaluations`, `/approvals`, and
`/settings` — described in
`../agentforge-docs/docs/architecture/10-frontend-structure.md`. See also
`../agentforge-docs/docs/architecture/02-component-responsibilities.md` and
`../agentforge-docs/docs/architecture/06-repository-structure.md` for how
this repo fits into the wider polyrepo.

## Depends on

- `agentforge-agent-schema` — pinned git dependency, used to drive Monaco's
  inline YAML validation and autocomplete on the agent editor pages.
- `agentforge-control-plane` — the backing API this app calls at runtime
  (not a build-time dependency).

## Related documentation

- [Architecture overview](../agentforge-docs/docs/architecture/01-overview.md)
- [Frontend structure](../agentforge-docs/docs/architecture/10-frontend-structure.md)
- [Component responsibilities](../agentforge-docs/docs/architecture/02-component-responsibilities.md)
- [Repository structure](../agentforge-docs/docs/architecture/06-repository-structure.md)
