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
npm run test -w @franklin/agent
npm run test -w @franklin/mini-acp

# Run a single test file
npx vitest run packages/agent/src/__tests__/spawn.test.ts

# Typecheck a single package
npm run typecheck -w @franklin/agent

# Run demo app in dev mode (Electron)
npm run dev -w @franklin/demo
```

You should lint, build and format always. And test where appropriate.

## Architecture

Franklin is an extension runtime for minimal agent loops.

### Packages (bottom-up)

- `@franklin/lib` — foundational library
  - Proxy descriptor algebra
  - Filesystem abstractions
  - Persistence utilities
- `@franklin/transport` — communication layer
  - Stream algebra and transports (stdio, HTTP, in-memory)
  - JSON-RPC bindings
- `@franklin/mini-acp` — agent protocol
  - Stateful but unpersisted agents
  - Externalized tool execution (client owns tools via reverse RPC)
  - Context tracking and streaming turns
- `@franklin/extensions` — plugin system
  - Tool registration, lifecycle event handlers, reactive stores
  - Compiles extensions into client + server middleware
  - Built-in extensions: conversation, todos, status, spawn, file editing
- `@franklin/agent` — application SDK
  - Session management (create, fork, child, restore)
  - File-based persistence
  - Auth management
- `@franklin/node` — Node.js platform bindings
- `@franklin/electron` — Electron platform bindings (main/renderer IPC)
- `@franklin/react` — React hooks and provider
- `@franklin/demo` — Electron demo app

## Workflow Conventions

### Project Management:

- **Use of Linear** - we use linear to keep track of tickets. When starting work from a particular ticket, also pull in the project description, comments, related issues etc to gain a comprehensive understanding of the: the problem, a consistent methodology for implementing problems of that class.
- **AI to build complicated tickets** - some tickets may be underspecified, primarily because they require a little exploration of the design space. As you implement such tickets, you may come across situations where a key architectural design choice must be made. Pausing to ask the user for input where you think it's needed is preferred to you making the decision, especially for long and complicated tasks.

### Code Style

- **File Names** - Prefer lower-kebab-case. For example `stop-reasons.ts`. Omit the name of the folder from the file-name, i.e prefer `block/text.ts` to `block/block-text.ts`
- **ESM only** — all packages use `"type": "module"`. Imports must include `.js` extensions.
- **Type imports** — use `import type` (enforced by eslint: `consistent-type-imports`, `no-import-type-side-effects`).
- **Exhaustive switches** — `switch-exhaustiveness-check` is enabled; no default case allowed on exhaustive switches.
- **Unused vars** — prefix with `_` (e.g., `_unused`).
- **Node ≥ 22** required.
- **Vitest** for testing — test files use `__tests__/*.test.ts` convention.
- **TypeScript project references** — root `tsconfig.json` references all packages; each package has its own `tsconfig.json` extending `tsconfig.base.json`. **Always build with `tsc -b`** (or `npm run build`). Never run bare `tsc` — it ignores `outDir`/`rootDir` from project references and emits build artifacts into `src/`.
- **Nesting** - prefer small files with single exported methods, with implementation in a series of files in a folder. Do not barallel exports from subfolders.
- **Exports** - Only export methods from packages if they are actually to be consumed. Do not re-export from other packages either.
- **Comments** - Avoid introducing lots of method or class docstrings. We should maintain the docstrings for exported package code, but want to avoid introducing potentially stale comments on library code. However, existing comments within implementation bodies (like todos) are very important to preserve across edits, and any potential resolutions should be flagged.

### UI

- **Ring over border** — prefer `ring` (or `ring-1`, `ring-inset`) over `border` for component outlines. Borders change element size and push layout; ring is an inset outline with no layout impact.

### Project Notes

**Whenever starting work in a package, make sure to read it's README.md**

- Mini-ACP:
  - Whenever you make a change related to the spec, you must read the README.md in the file and adjust it if necessary. That is the single source of truth on the spec.
