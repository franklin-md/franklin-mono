# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Franklin

Franklin is a managed-agent abstraction layer. The app never talks directly to vendor runtimes (Claude Code, Codex, OpenCode). Instead, it talks to a **managed agent** that exposes a stable protocol, and vendor-specific behavior lives inside adapters.

## Commands

```bash
# Build all packages (TypeScript project references)
npm run build

# Typecheck all packages
npm run typecheck

# Run all tests (vitest)
npm run test

# Run tests for a single package
npm run test -w @franklin/managed-agent

# Format
npm run format          # write
npm run format:check    # check only

# Clean build artifacts
npm run clean
```

## Project Structure

npm workspaces monorepo. Node >= 22. ESM-only (`"type": "module"`).

### Current packages

- `packages/managed-agent` (`@franklin/managed-agent`) — Protocol types for the managed-agent contract: commands, events, items, permissions, sessions, results. **Types only** at this stage; no runtime code yet.

### Planned packages (from ARCHITECTURE.md)

- `packages/managed-agent-core` — Controller, adapter registry, command dispatch, state management
- `packages/adapter-claude` — Claude Code stream-json adapter
- `packages/adapter-codex` — Codex app-server adapter
- `apps/ink` — Ink-based TUI

## Architecture (key decisions)

**Layer model (top to bottom):**

1. **App** — rendering, user interaction (Ink TUI, Obsidian plugin, etc.)
2. **Managed agent protocol** — stable command/event contract between app and agent
3. **Managed agent core** — controller, adapter registry, state, event normalization
4. **Vendor adapters** — translate between Franklin protocol and vendor runtimes
5. **Runtime harness** — MCP injection, hooks, skills, profiles (separate from core)
6. **Local capability bridge** — deferred; local tools and capability endpoints

**Communication:** JSON-RPC 2.0 semantics. Commands are requests, results are responses, streamed updates are notifications. Wire format is newline-delimited JSON over piped stdio (child process).

**Message flow:** App sends `ManagedAgentCommand` (inbound) → agent emits `ManagedAgentEvent` (outbound). Commands are discriminated unions on `type` field (`session.start`, `turn.start`, `permission.resolve`, etc.). Events follow the same pattern (`agent.ready`, `item.delta`, `turn.completed`, etc.).

**Design rules:**

- App talks only to the managed-agent protocol, never vendor protocols
- Franklin owns the state model; vendor state stays inside adapters
- PTY is deferred; not part of initial transport
- Runtime harness (MCP, hooks, skills) is separate from lifecycle/control core

## Code Conventions

- TypeScript strict mode with `noUncheckedIndexedAccess`
- Tabs for indentation, single quotes, semicolons, trailing commas (Prettier)
- Types use discriminated unions on `type` or `kind` fields
- All exports are type-only re-exports at this stage
- File imports use `.js` extensions (NodeNext module resolution)
