# Franklin Architecture

Status: architecture commitment draft
Date: 2026-03-12

## Purpose

This document commits the first architectural shape of Franklin as a standalone system.

It is intentionally opinionated. The goal is to stop looping on abstract structure and create a concrete starting point for implementation.

This document defines:

- the core abstraction
- the communication contract
- the initial package boundaries
- the implementation order

It does not finalize every schema or every adapter detail.

## Core abstraction

The core abstraction of Franklin is the **managed agent**.

The app does not talk directly to Claude Code, Codex, OpenCode, or any other vendor runtime.

Instead:

- the app talks to a managed agent
- the managed agent exposes a stable Franklin protocol
- the managed agent delegates vendor-specific behavior to an adapter

This gives Franklin:

- one app-facing contract
- multiple runtime adapters
- a clean place to normalize lifecycle, state, and events

## Layer model

Franklin is organized as a stack of distinct concerns.

### 1. App

The app is the user-facing client.

Examples:

- Ink TUI
- Obsidian plugin
- future desktop app

The app owns:

- rendering
- user interaction
- app-level process ownership
- session lists and local UI state

The app does not own vendor-specific runtime logic.

### 2. Managed agent protocol

This is the stable communication contract between the app and a managed agent.

It defines:

- commands
- command results
- notifications
- state snapshots
- session identity

This protocol must be independent from how the managed agent is spawned.

### 3. Managed agent core

This is the Franklin library that implements the managed agent contract.

It owns:

- command routing
- session/controller state
- adapter registration
- normalized event emission
- lifecycle coordination

It does not own:

- vendor-specific CLI details
- runtime-specific config formats
- application rendering

### 4. Vendor adapters

Each adapter translates between Franklin's managed-agent model and a specific runtime.

Examples:

- Claude Code adapter
- Codex adapter
- OpenCode adapter

Each adapter owns:

- vendor process launch and connection
- vendor protocol handling
- command translation
- event translation
- runtime-specific config generation

### 5. Runtime harness

This is the layer that extends the underlying runtime.

Examples:

- MCP injection
- hooks
- skills
- prompt modules
- agent profiles

This layer is separate from managed-agent core.

Reason:

- managed-agent core is about lifecycle and communication
- harness is about extending runtime behavior

### 6. Local capability bridge

This is a later-phase library for exposing local app capabilities into the runtime ecosystem.

Examples:

- filesystem-backed local tools
- local HTTP-backed tools
- application-owned capability endpoints

This is separate from both managed-agent core and runtime harness.

## Runtime model

The runtime surface currently has four concerns.

### Session context

Base execution context:

- current working directory
- workspace
- environment variables
- model/runtime selection
- approval mode
- sandbox mode
- profile

### Session control

Lifecycle operations:

- start
- resume
- fork
- input
- interrupt
- stop
- inspect

### Session observation

What the outer system sees:

- raw output
- structured messages
- status changes
- permission events
- tool events where available
- completion
- exit

### Session harness

What gets attached to the runtime:

- MCP servers
- hooks
- skills
- profiles
- generated runtime config

## Communication commitment

Franklin will use a structured protocol between app and managed agent.

### Protocol semantics

The protocol will use:

- request/response for commands
- notifications for streamed events

The semantic model should follow JSON-RPC 2.0.

This means:

- commands are requests
- results are responses
- streamed runtime updates are notifications

Franklin may later vary wire framing, but the semantic model should remain stable.

### Initial framing

The initial framing should be:

- newline-delimited JSON
- over a generic byte stream

This keeps the protocol usable over:

- stdio
- pipes
- sockets
- future bridges

### Initial transport

For the first implementation, the transport should be:

- child process
- piped stdio

Reason:

- lowest implementation cost
- maps well to Claude stream-json
- maps well to Codex App Server
- avoids unnecessary daemon/server work early

### PTY status

PTY is not part of the initial design.

It is a fallback transport for specific interactive runtimes, not the foundation of Franklin's app-to-agent protocol.

## State commitment

Franklin must define a controller-owned state model that is stable regardless of vendor runtime.

This state is the contractual model exposed to the app.

Examples of state that Franklin should own:

- Franklin session reference
- runtime kind
- runtime session ID
- status
- timestamps
- pending permission state
- current turn/run state
- metadata needed for resume/fork/inspect

Vendor-specific adapters may translate to and from vendor concepts, but the app should consume Franklin-owned state.

## Protocol boundary

The managed-agent protocol does not define how a vendor runtime is internally driven.

That is adapter territory.

The protocol boundary is:

- app sends commands to managed agent
- managed agent emits normalized notifications back

The app should never need to know:

- Claude stream-json message details
- Codex app-server notification names
- OpenCode server event names

## Initial package plan

The first implementation should be organized into these packages:

### `packages/managed-agent-protocol`

Owns:

- command types
- notification types
- state types
- session reference types
- runtime validation schemas if used

### `packages/managed-agent-core`

Owns:

- managed agent controller
- adapter registration
- command dispatch
- state management
- event normalization pipeline

### `packages/adapter-claude`

Owns:

- Claude Code connection
- Claude command mapping
- Claude event mapping
- Claude harness application

### `packages/adapter-codex`

Owns:

- Codex connection
- Codex command mapping
- Codex event mapping
- Codex harness application

### `apps/ink`

Owns:

- TUI
- process startup for the first milestone
- session list
- session rendering
- user input routing

## Deferred packages

These are important, but not required for the first implementation step.

### `packages/runtime-harness`

For:

- MCP config generation
- hooks
- skills
- profiles

### `packages/local-capability-bridge`

For:

- local filesystem-backed tools
- local HTTP-backed capability endpoints

### `packages/adapter-opencode`

Useful, but not required to prove the architecture.

## Implementation order

Franklin should be built in this order.

### Phase 1. Protocol

Define:

- commands
- notifications
- state snapshot types
- session reference types

This is the most important first milestone.

### Phase 2. Core controller

Implement:

- adapter registry
- command routing
- state tracking
- event emission

### Phase 3. Claude adapter

Use Claude Code `stream-json` as the first real adapter target.

Why Claude first:

- simpler structured streaming model
- enough complexity to validate the architecture
- lower overhead than starting with Codex app-server

### Phase 4. Ink app

Build a minimal TUI that can:

- start a managed session
- send input
- render notifications
- show session state

### Phase 5. Codex adapter

Add Codex app-server support.

This will validate that the protocol also works well for a more RPC-native runtime.

### Phase 6. Runtime harness

Add:

- MCP injection
- hooks
- skills
- config generation

### Phase 7. Local capability bridge

Later-phase work for local application integrations.

## Design rules

1. The app talks only to the managed-agent protocol.
2. Vendor protocols must stay inside adapters.
3. Franklin state is owned by managed-agent core, not leaked from vendors.
4. PTY is optional and deferred.
5. Protocol semantics come first; transport bootstrapping comes second.
6. Runtime harness is separate from lifecycle/control core.
7. Local capability bridging is a separate product/library concern.

## Immediate next steps

1. Define the exact managed-agent protocol schema.
2. Define the controller-owned state model.
3. Create the initial package skeleton.
4. Implement the first adapter against Claude stream-json.

## Open questions

1. Should Franklin use strict JSON-RPC 2.0 on the wire from day one, or JSON-RPC-like semantics with a simpler envelope?
2. Should `run one turn` be first-class or derived from `start/resume + input + result`?
3. Should the managed agent be its own subprocess from the start, or should the first Ink app embed managed-agent core in-process?

These remain open, but they do not block the initial implementation skeleton.
