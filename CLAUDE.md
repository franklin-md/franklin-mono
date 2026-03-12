# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build all packages (TypeScript project references)
npm run build            # tsc -b

# Lint (strict — zero warnings allowed)
npm run lint             # eslint . --cache --max-warnings=0
npm run lint:fix         # autofix

# Format
npm run format           # prettier --write .
npm run format:check     # check only

# Test all packages
npm run test             # runs vitest in each workspace

# Test a single package
npm run test -w @franklin/managed-agent
npm run test -w @franklin/agent-manager
npm run test -w @franklin/tui

# Run a single test file
npx vitest run packages/managed-agent/src/adapter/codex/__tests__/codex-adapter.test.ts

# Typecheck a single package
npm run typecheck -w @franklin/managed-agent

# Run TUI in dev mode (with mock adapter)
npm run dev -w @franklin/tui   # tsx src/index.tsx --mock
```

You should lint, build and format always. And test where appropriate.

## Architecture

Franklin is a managed-agent framework. The app never talks directly to vendor runtimes (Codex, Claude Code, etc.) — it talks to a **managed agent** that normalizes lifecycle, state, and events through vendor-specific **adapters**.

### Layer stack (top → bottom)

1. **App** (`apps/tui`) — Ink/React TUI. Owns rendering, user interaction, session list UI. Depends on `agent-manager`.
2. **Agent Manager** (`packages/agent-manager`) — Manages multiple agent handles. Owns agent lifecycle (create/dispose), event routing, metadata persistence via `AgentStore`. The `AgentHandle` is the per-agent interface the app uses.
3. **Managed Agent** (`packages/managed-agent`) — Defines the protocol (commands, events, items, permissions, sessions) and adapter interface. Contains vendor adapters.
4. **Vendor Adapters** (currently `managed-agent/src/adapter/codex/`) — Translate between Franklin protocol and vendor-specific APIs. Codex adapter uses JSON-RPC over child-process stdio.

### Key types and interfaces

- `ManagedAgentAdapter` — adapter contract: `dispatch(command) → result`, `dispose()`, emits events via `onEvent` callback.
- `ManagedAgentCommand` / `ManagedAgentEvent` — the protocol's inbound/outbound message types (defined in `managed-agent/src/messages/`).
- `AgentManager` — creates agents with `createAgent(spec)`, returns `AgentHandle`.
- `AgentHandle` — per-agent API: `sendCommand()`, `subscribe()`, `dispose()`. Manages status transitions.
- `AgentStore` — persistence interface for metadata + events. `InMemoryAgentStore` is the current implementation.
- `AdapterFactory` — function that creates an adapter given `(adapterKind, options)`.

### Testing exports

Both `@franklin/managed-agent` and `@franklin/agent-manager` export a `/testing` subpath with mock implementations (`MockAdapter`, `MockAgentManager`) for use in tests and dev mode.

### Dependency graph

```
apps/tui → @franklin/agent-manager → @franklin/managed-agent
```

## Code conventions

- **ESM only** — all packages use `"type": "module"`. Imports must include `.js` extensions.
- **Type imports** — use `import type` (enforced by eslint: `consistent-type-imports`, `no-import-type-side-effects`).
- **Exhaustive switches** — `switch-exhaustiveness-check` is enabled; no default case allowed on exhaustive switches.
- **Unused vars** — prefix with `_` (e.g., `_unused`).
- **Node ≥ 22** required.
- **Vitest** for testing — test files use `__tests__/*.test.ts` convention.
- **TypeScript project references** — root `tsconfig.json` references all packages; each package has its own `tsconfig.json` extending `tsconfig.base.json`.
