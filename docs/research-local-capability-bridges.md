# Local Capability Bridge Research

Status: first-pass research
Date: 2026-03-12
Scope: filesystem bridge, local HTTP, stdio sidecar, sockets/pipes

## Goal

Understand whether Franklin should invent a new "MCP for local apps" layer now, or whether it should build a thinner capability host on top of existing MCP transport patterns.

## Working conclusion

Do not invent a new transport layer first.

Instead:

- use existing standard transports where possible
- keep filesystem handoff as a separate persistence/artifact channel
- design a host-side "capability bridge" above transport

The reusable thing is probably not a new wire protocol. It is a local capability host that can expose:

- filesystem-backed capabilities
- local HTTP-backed capabilities
- future daemon/IPC-backed capabilities

through a consistent tool/capability model.

## What MCP already standardizes

MCP already gives you most of the wire-level pieces:

- `stdio`
- Streamable HTTP
- JSON-RPC semantics
- logging
- elicitation
- OAuth-style auth guidance for HTTP
- packaging of local desktop extensions via MCPB

What MCP does not give you:

- a generic "local app bridge" abstraction
- host UX for approvals, prompts, and tool flows
- your product's session/runtime model

## Bridge options


| Bridge type                | Best use                                                                    | Standardization                   | Difficulty    | Portability   | Main drawback                                               |
| -------------------------- | --------------------------------------------------------------------------- | --------------------------------- | ------------- | ------------- | ----------------------------------------------------------- |
| `stdio` sidecar            | parent-launched local helpers, one client to one subprocess                 | Strong in MCP                     | Low           | High          | poor fit for multi-client or independently running services |
| Local HTTP                 | reusable local services, multi-client access, debugger-style control planes | Strong in MCP via Streamable HTTP | Medium        | High          | auth, lifecycle, localhost exposure, CORS/origin concerns   |
| Filesystem handoff         | durable requests, artifacts, transcripts, coarse async coordination         | Not standardized by MCP           | Low           | High          | weak for low-latency interactive bidirectional control      |
| Unix sockets / named pipes | local-only daemon/control plane                                             | Custom transport                  | Medium        | Medium        | still custom; more cross-platform complexity                |
| Node `ipc` channel         | Node-to-Node helpers only                                                   | Not MCP-standard                  | Low to Medium | Low to Medium | too narrow for general CLI/runtime bridging                 |


## Recommended strategy for Franklin

### 1. Default local bridge: `stdio` sidecars

Use `stdio` for:

- MCP servers launched by the app
- runtime wrappers around local helper processes
- simple one-parent-one-child capability hosts

Why:

- lowest implementation cost
- already standard in MCP
- smallest attack surface
- easiest Ink-first path

### 2. Keep filesystem as a separate artifact/control channel

Use filesystem handoff for:

- task requests
- transcripts
- notes
- durable artifacts
- background work handoff

Do not treat this as your general interactive transport.

### 3. Add local HTTP only when you need a reusable service

Use local HTTP when you need:

- multiple clients
- a background service or daemon
- a documented programmatic API
- desktop/mobile/web clients attaching to the same backend

This is the strongest bridge candidate if you later want Franklin Desktop, IDE integrations, and remote control surfaces to converge.

### 4. Delay sockets/pipes

Unix sockets or named pipes may be attractive later for a local-only daemon, but they should not be the first abstraction. They add complexity before you know you need them.

## What this means for package design

I would separate:

### `@franklin/capability-core`

Owns:

- capability descriptors
- invocation model
- approval model
- typed request/response envelopes
- capability namespaces

This package should be transport-agnostic.

### `@franklin/capability-transport-stdio`

Owns:

- child process launch
- stdio framing
- request/response multiplexing if needed

### `@franklin/capability-transport-http`

Owns:

- local server boot
- auth headers/basic auth/token flow
- loopback restrictions
- OpenAPI/docs generation if useful

### `@franklin/capability-filesystem`

Owns:

- file-over-app request queues
- artifact storage
- atomic writes
- lock/consume semantics

This package is not an RPC transport. It is a durable coordination layer.

## Security notes to preserve in the spec

Even if security is not the main design thread yet, it needs to stay visible as a first-class concern.

Keep these as explicit spec points:

1. Capability attachment model
  Is a capability globally available, session-attached, or prompt-scoped?
2. Approval boundary
  Which calls require explicit user approval?
3. Secret handling
  Where do credentials live for local HTTP and subprocess bridges?
4. Auditability
  Can the host persist a transcript of capability calls and results?
5. Localhost hardening
  If HTTP exists, what binds are allowed? `127.0.0.1` only? password? token? CORS?
6. Filesystem safety
  Atomic writes, path validation, lock cleanup, and partial-failure handling

## Research implications

This research suggests two separate product/library opportunities:

### A. Agent runtime core

This is the session/runtime abstraction for Claude Code, Codex, OpenCode, and similar agents.

### B. Local capability host

This is the reusable layer that exposes local capabilities to runtimes and apps without assuming web APIs.

They should stay separate.

The capability host can serve:

- the Franklin Ink app
- the Franklin knowledge runtime
- external MCP clients
- future desktop app integrations

## Recommended next experiments

1. Ink-first `stdio` prototype
  Launch one local sidecar capability host over stdio and prove the API shape.
2. File-over-app durable queue
  Keep a very small filesystem handoff layer for background task requests and artifacts.
3. HTTP prototype later
  Only after you know you need multi-client access.

## Open questions

1. Should the capability host speak MCP directly, or should it expose a Franklin-native API that can also be wrapped as MCP?
2. Do you want long-lived background services early, or should the Ink app own all subprocess lifecycles at first?
3. Which capability classes matter first: filesystem, local HTTP service discovery, browser/debugger, or editor integration?

## Sources

- MCP transports: [https://modelcontextprotocol.io/specification/2025-06-18/basic/transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- MCP authorization: [https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- MCP logging: [https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/logging](https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/logging)
- MCP elicitation: [https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation)
- MCP TypeScript SDK docs: [https://ts.sdk.modelcontextprotocol.io/documents/server.html](https://ts.sdk.modelcontextprotocol.io/documents/server.html)
- MCPB: [https://github.com/modelcontextprotocol/mcpb](https://github.com/modelcontextprotocol/mcpb)
- Claude desktop extensions with MCPB: [https://support.claude.com/en/articles/12922929-building-desktop-extensions-with-mcpb](https://support.claude.com/en/articles/12922929-building-desktop-extensions-with-mcpb)
- Claude Desktop local MCP overview: [https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)
- Claude Desktop allowlist controls: [https://support.claude.com/en/articles/12592343-enabling-and-using-the-desktop-extension-allowlist](https://support.claude.com/en/articles/12592343-enabling-and-using-the-desktop-extension-allowlist)
- Node child process docs: [https://nodejs.org/download/release/v22.19.0/docs/api/child_process.html](https://nodejs.org/download/release/v22.19.0/docs/api/child_process.html)
- Node net docs: [https://nodejs.org/download/release/latest-v20.x/docs/api/net.html](https://nodejs.org/download/release/latest-v20.x/docs/api/net.html)
- Electron security guide: [https://www.electronjs.org/docs/latest/tutorial/security](https://www.electronjs.org/docs/latest/tutorial/security)

