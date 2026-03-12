# Communication Protocol Research

Status: first-pass research
Date: 2026-03-12
Scope: JSONL streams, JSON-RPC, app-server mode, HTTP/SSE

## Goal

Figure out what communication design makes sense for Franklin's managed-agent layer.

This document focuses on the protocol between:

- the Franklin app
- the Franklin managed agent
- the underlying runtime adapter

It does not focus on MCP itself.

## Main finding

There are three real protocol shapes in play.

### 1. Structured JSONL stream over stdio

Best example: Claude Code `--output-format stream-json` with optional `--input-format stream-json`.

Characteristics:

- line-delimited JSON over stdin/stdout
- easy to spawn as a child process
- good for one-shot and multi-turn streaming
- simple to parse
- weak as a general request/response protocol unless you add your own correlation and control envelopes

### 2. Bidirectional request/response protocol over stdio

Best example: Codex App Server.

Characteristics:

- long-lived child process
- request/response plus notifications
- server can initiate requests back to the client
- naturally models approvals, pauses, multi-event turns, and rich session control
- more complex, but much better as a full app integration surface

### 3. HTTP API plus SSE event stream

Best example: OpenCode server.

Characteristics:

- multi-client friendly
- clear API surface via OpenAPI
- SSE for live events
- easiest to integrate remotely or from many surfaces
- heavier than stdio for an Ink-first local app

## What the runtimes expose

## Claude Code

As of 2026-03-12, Claude Code supports:

- `--output-format text | json | stream-json`
- `--input-format text | stream-json`
- `--include-partial-messages` in `stream-json`
- `--resume`, `--continue`, and `--fork-session`
- a permission prompt tool for non-interactive approval handling

The SDK docs describe `stream-json` as JSONL where each line is a complete JSON object. They also document a typed message schema that includes:

- `system/init`
- `user`
- `assistant`
- `result/success`
- `result/error_*`

This is a real structured surface, not just terminal scraping.

Implication:

- Claude is best modeled as an event-stream runtime with optional streaming input.
- It does not need PTY for app integration if `stream-json` is sufficient.
- If Franklin wants richer request/response semantics, the adapter should translate Claude's stream into Franklin's protocol rather than exposing Claude's wire format directly.

## Codex

As of 2026-03-12, OpenAI's official App Server design is the clearest "managed agent" reference.

OpenAI describes the App Server as:

- a long-lived process
- JSON-RPC over stdio framed as JSONL
- fully bidirectional
- one client request producing many notifications
- server-initiated requests for things like approvals
- a stable, UI-ready notification surface generated from lower-level internal events

OpenAI also explicitly says this is their recommended first-class integration method going forward, while `codex exec` is the lighter one-shot path.

One important nuance:

- OpenAI says this is a "JSON-RPC lite" variant
- it keeps request/response/notification semantics
- it omits the `"jsonrpc": "2.0"` field
- it is framed as JSONL over stdio

Implication:

- Codex App Server is the strongest evidence that Franklin should have a real command/event protocol, not just a streamed transcript.
- It is also strong evidence that server-initiated requests are necessary if approvals or other blocking interactions are part of the loop.

## OpenCode

As of 2026-03-12, OpenCode exposes:

- `opencode serve`: HTTP API with OpenAPI 3.1
- `/event` and `/global/event`: SSE streams
- session lifecycle endpoints including create, fork, abort, revert, permissions
- message send/wait and async prompt endpoints
- TUI control endpoints
- raw JSON event output from CLI `run --format json`
- an ACP server via stdin/stdout using nd-JSON

Implication:

- OpenCode shows the cleanest split between TUI and runtime backend.
- It is a good model if Franklin later wants a local or remote server.
- For Ink v1, it is still probably heavier than necessary to copy exactly.

## JSONL vs JSON-RPC vs HTTP/SSE

### JSONL stream only

Pros:

- trivial framing
- easy child-process integration
- good fit for Claude-style message streams
- low implementation cost

Cons:

- no standard request/response semantics by itself
- weak for approvals, inspect/state calls, and session management
- you end up inventing correlation IDs and command envelopes anyway

### JSON-RPC over stdio

Pros:

- standard request/response/notification model
- allows server-initiated requests
- fits Codex app-server mode naturally
- maps cleanly to a managed-agent command surface
- good library support across languages

Cons:

- more structure than you need for a one-shot CLI
- requires explicit event design rather than just relaying lines

### HTTP + SSE

Pros:

- strongest option for multi-client and remote use
- OpenAPI gives you documentation and codegen
- natural separation between control API and event stream

Cons:

- more moving parts
- server lifecycle, ports, auth, SSE reconnects
- unnecessary overhead for an Ink-only first milestone

## Recommended design for Franklin

### Recommendation

Franklin's internal managed-agent protocol should be:

- strict JSON-RPC 2.0 semantics
- framed as JSONL over stdio for local child processes
- with notifications used for event streaming

This is my recommendation, not something the vendors themselves standardize today.

Why this is the best fit:

1. It maps naturally to Codex App Server.
2. It can represent Claude's event stream after adapter translation.
3. It supports server-initiated approval requests.
4. It gives you a standard request/response foundation without committing to HTTP yet.
5. You can later tunnel or expose the same semantics over HTTP/WebSocket/SSE if needed.

### Important refinement

Franklin should use strict JSON-RPC 2.0 internally, not Codex's "JSON-RPC lite".

Reason:

- Franklin controls both ends.
- Standard JSON-RPC libraries and tooling are useful.
- The extra `"jsonrpc": "2.0"` field is negligible.
- There is no reason for Franklin to inherit a vendor-specific simplification.

Codex's lite variant should be treated as an adapter concern.

## Recommended semantic split

### Commands

Use JSON-RPC requests for:

- start
- resume
- fork
- send input
- interrupt
- stop
- inspect state
- resolve permission request

### Events

Use JSON-RPC notifications for:

- started
- ready
- output
- message
- tool event
- permission requested
- status changed
- result
- error
- exited

### Why this matters

This gives Franklin a protocol that can:

- drive one-shot runs
- drive long-lived sessions
- pause for approval
- stream UI-ready events
- keep command semantics distinct from event semantics

## What not to do

1. Do not build the app around terminal parsing.
2. Do not make PTY the default communication model.
3. Do not expose vendor wire formats directly to the app.
4. Do not jump to HTTP first for Ink v1 unless multiple clients are already required.

## Suggested first milestone

For Ink v1:

- child process
- piped stdio
- JSON-RPC 2.0 over JSONL
- one managed-agent wrapper process
- one Claude adapter using `stream-json`
- one Codex adapter targeting App Server if practical, otherwise a simpler structured mode first

This gives Franklin the right architecture without overcommitting to a daemon yet.

## Open questions

1. Should Franklin's managed-agent process be a separate binary/process from the app, or just an in-process library with the same protocol model?
2. Should `run one turn` be a first-class command, or a convenience layered on `start/resume + input + await result`?
3. Should event notifications be purely normalized, or should they preserve a `raw` vendor payload for debugging?
4. When Franklin later adds HTTP, should it mirror the same JSON-RPC protocol over WebSocket/HTTP, or split into REST + SSE?

## Sources

- Claude Code CLI reference: https://code.claude.com/docs/en/cli-reference
- Claude Code SDK docs: https://docs.anthropic.com/s/claude-code-sdk
- Codex App Server engineering post: https://openai.com/index/unlocking-the-codex-harness/
- OpenCode server docs: https://opencode.ai/docs/server/
- OpenCode CLI docs: https://opencode.ai/docs/cli/
- JSON-RPC 2.0 spec: https://www.jsonrpc.org/specification
