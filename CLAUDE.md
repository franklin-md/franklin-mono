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
npm run test -w franklin
npm run test -w @franklin/tui

# Run a single test file
npx vitest run packages/franklin/src/__tests__/spawn.test.ts

# Typecheck a single package
npm run typecheck -w franklin

# Run TUI in dev mode (with mock adapter)
npm run dev -w @franklin/tui   # tsx src/index.tsx --mock
```

You should lint, build and format always. And test where appropriate.

## Architecture

Franklin is a middleware stack for ACP-compliant coding agents. It builds on the [Agent Client Protocol (ACP)](https://agentclientprotocol.com) for wire communication and adds middleware layers (history, modules, permissions) on top.

See README.md


## Code conventions

- **ESM only** — all packages use `"type": "module"`. Imports must include `.js` extensions.
- **Type imports** — use `import type` (enforced by eslint: `consistent-type-imports`, `no-import-type-side-effects`).
- **Exhaustive switches** — `switch-exhaustiveness-check` is enabled; no default case allowed on exhaustive switches.
- **Unused vars** — prefix with `_` (e.g., `_unused`).
- **Node ≥ 22** required.
- **Vitest** for testing — test files use `__tests__/*.test.ts` convention.
- **TypeScript project references** — root `tsconfig.json` references all packages; each package has its own `tsconfig.json` extending `tsconfig.base.json`.
- **Nesting** - prefer small files with single exported methods, with implementation in a series of files in a folder.