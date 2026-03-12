# Managed Agent Protocol

Status: planning draft
Date: 2026-03-12

## Purpose

Define the app-facing protocol for running and controlling agent runtimes through a stable Franklin-managed wrapper.

This sits above vendor-specific runtimes such as Claude Code, Codex, and OpenCode.

It does not define:

- PTY behavior
- MCP internals
- knowledge-runtime policy
- local tool bridge details

It defines the stable contract between:

- the Franklin app
- a managed agent process
- a runtime adapter inside that managed agent

## Core idea

The app should not talk directly to Claude Code, Codex, or OpenCode.

Instead, the app should talk to a Franklin-managed agent over a stable structured protocol.

The managed agent is responsible for:

- launching the underlying runtime
- translating app commands into runtime-specific operations
- translating runtime-specific output into normalized events
- applying the requested harness configuration

This gives Franklin one app-facing protocol and multiple runtime adapters behind it.

## Layer model

### App

Owns:

- UI
- session list
- user input
- rendering messages and status
- local process ownership at the app level

### Managed agent

Owns:

- process/session lifecycle
- protocol framing
- event emission
- adapter selection
- adapter wiring

### Runtime adapter

Owns:

- vendor-specific process launch
- vendor-specific control protocol
- vendor-specific config generation
- vendor-specific event translation

### Underlying runtime

Examples:

- Claude Code
- Codex
- OpenCode

## Transport assumption

The default assumption should be:

- subprocess
- piped stdio
- structured protocol over stdin/stdout

Examples:

- JSONL event streams
- JSON-RPC over stdio

PTY should be treated as optional fallback, not the primary protocol.

## Protocol shape

The managed-agent protocol should have two surfaces:

### 1. Commands

App to managed agent.

### 2. Events

Managed agent to app.

The command surface should be request/response oriented.
The event surface should be stream oriented.

## Suggested command model

```ts
type AgentCommand =
  | {
      type: "agent.start";
      spec: SessionSpec;
    }
  | {
      type: "agent.resume";
      ref: SessionRef;
      context?: Partial<SessionContextSpec>;
      harness?: Partial<HarnessSpec>;
    }
  | {
      type: "agent.fork";
      ref: SessionRef;
      spec?: Partial<SessionSpec>;
    }
  | {
      type: "agent.input";
      ref: SessionRef;
      input: SessionInput;
    }
  | {
      type: "agent.interrupt";
      ref: SessionRef;
    }
  | {
      type: "agent.stop";
      ref: SessionRef;
    }
  | {
      type: "agent.inspect";
      ref: SessionRef;
    };
```

## Suggested command result model

```ts
type AgentCommandResult =
  | {
      ok: true;
      ref?: SessionRef;
      state?: SessionStateSnapshot;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        retryable?: boolean;
      };
    };
```

## Suggested event model

```ts
type ManagedAgentEvent =
  | {
      type: "agent.started";
      ref: SessionRef;
    }
  | {
      type: "agent.ready";
      ref: SessionRef;
    }
  | {
      type: "agent.status";
      ref: SessionRef;
      status: AgentStatus;
    }
  | {
      type: "agent.output";
      ref: SessionRef;
      stream: "stdout" | "stderr" | "runtime";
      text: string;
    }
  | {
      type: "agent.message";
      ref: SessionRef;
      message: AgentMessage;
    }
  | {
      type: "agent.tool";
      ref: SessionRef;
      event: ToolEvent;
    }
  | {
      type: "agent.permission";
      ref: SessionRef;
      event: PermissionEvent;
    }
  | {
      type: "agent.result";
      ref: SessionRef;
      result: AgentResult;
    }
  | {
      type: "agent.error";
      ref?: SessionRef;
      error: AgentError;
    }
  | {
      type: "agent.exited";
      ref: SessionRef;
      exitCode?: number;
      signal?: string;
    };
```

## Why `output` and `message` are separate

This distinction is important.

`agent.output` is raw runtime output:

- stdout lines
- stderr lines
- stream-json fragments that are not yet normalized
- diagnostic output

`agent.message` is normalized semantic content:

- user message
- assistant message
- system message
- maybe tool summary if promoted to message level

Some runtimes will only reliably provide raw output.
Some will provide higher-level messages.
The protocol should preserve both.

## Suggested state model

```ts
type AgentStatus =
  | "starting"
  | "ready"
  | "running"
  | "waiting"
  | "interrupting"
  | "stopped"
  | "exited"
  | "error";
```

```ts
interface SessionStateSnapshot {
  ref: SessionRef;
  status: AgentStatus;
  startedAt?: string;
  updatedAt?: string;
  lastMessageId?: string;
  pendingPermission?: boolean;
  metadata?: Record<string, unknown>;
}
```

## Session types

These build on the earlier runtime note.

```ts
interface SessionContextSpec {
  cwd?: string;
  workspace?: string;
  env?: Record<string, string>;
  approvalMode?: string;
  sandboxMode?: string;
  profile?: string;
  model?: string;
}
```

```ts
interface HarnessSpec {
  mcpServers?: MCPServerSpec[];
  hooks?: HookSpec[];
  skills?: SkillSpec[];
  agentProfile?: AgentProfileSpec;
  runtimeConfig?: Record<string, unknown>;
}
```

```ts
interface SessionSpec {
  runtime: string;
  context: SessionContextSpec;
  harness?: HarnessSpec;
  initialPrompt?: string;
}
```

```ts
interface SessionRef {
  runtime: string;
  sessionId: string;
}
```

## Adapter responsibilities

Each runtime adapter should implement four jobs.

### 1. Launch

- start the runtime process or connect to its sidecar/server mode
- apply base session context
- create or recover session identity

### 2. Control translation

Convert normalized commands into vendor-specific actions.

Examples:

- `agent.input` -> JSONL line, JSON-RPC request, or CLI stdin write
- `agent.interrupt` -> signal, RPC call, or protocol message
- `agent.resume` -> vendor-specific resume flags or API call

### 3. Event translation

Convert vendor-specific protocol events into normalized managed-agent events.

Examples:

- Claude `stream-json` events -> `agent.message`, `agent.permission`, `agent.result`
- Codex app-server notifications -> `agent.status`, `agent.message`, `agent.tool`
- OpenCode server events -> same normalized surface

### 4. Harness application

Translate Franklin harness inputs into vendor-specific config.

Examples:

- MCP server config files
- environment variables
- generated agent/profile files
- hook registration
- skill attachment

## Message categories to normalize

Based on the current research, these appear to be the most important categories:

- lifecycle
- assistant content
- user content
- tool summary / tool events
- permission request / permission resolution
- keepalive / heartbeat
- result / completion
- error
- cancellation / interruption

Not every runtime will expose all of them with equal fidelity.
That is acceptable.
The protocol should allow partial support.

## Capability flags

The managed agent should advertise what an adapter can actually do.

```ts
type ManagedAgentCapability =
  | "resume"
  | "fork"
  | "structured_input"
  | "structured_output"
  | "tool_events"
  | "permission_events"
  | "heartbeats"
  | "one_turn"
  | "interactive_stream"
  | "mcp_injection"
  | "hook_injection"
  | "skill_injection";
```

This avoids pretending every runtime supports every behavior.

## Open design questions

### 1. Is `agent.input` enough?

Possible answer:

- yes for low-level protocol
- add `agent.run_turn` later as a convenience if it is common enough

### 2. Is `initialPrompt` part of `agent.start`?

Likely yes for convenience, but the protocol should not require it.

### 3. Should permission handling be interactive commands?

Likely yes if the runtime exposes explicit permission requests.

Potential addition:

```ts
type AgentCommand =
  | { type: "agent.permission.resolve"; ref: SessionRef; requestId: string; decision: "allow" | "deny" };
```

### 4. Should the managed agent itself speak JSON-RPC?

Maybe.

But the more important part right now is the semantic model, not the exact framing.

The semantic contract should be stable even if the wire framing changes.

## Recommended next step

Research app-server / structured-stdio mode in more detail for:

- Claude Code `stream-json`
- Codex app-server
- OpenCode server / JSON event mode

Then write a follow-up document:

- exact vendor event mappings
- exact command mappings
- minimum common denominator protocol
