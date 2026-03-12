# Runtime Surface Note

Status: planning draft
Date: 2026-03-12

## Purpose

Capture the current split for the runtime layer before package structure is finalized.

The goal is to define the runtime surface in terms of types and responsibilities, then map packages after the surface is stable.

## Working split

The runtime surface currently appears to have four concerns.

### 1. Session context

This is the setup required to establish the execution context for a session.

Examples:

- current working directory
- workspace root
- environment variables
- model or runtime selection
- approval mode / sandbox policy
- profile selection

This is not the harness. It is the base execution context.

### 2. Session control

This is how a session is created and controlled over time.

Examples:

- start
- resume
- fork
- interrupt
- stop
- possibly "run one turn" for runtimes that support one-shot turn execution cleanly

Open question:

- whether "run one turn" belongs here or under interaction
- likely answer: keep it near control if it is implemented as a session-level operation rather than raw input streaming

### 3. Session events and observation

This is how the outer system observes what the inner runtime is doing.

Examples:

- stream output
- structured messages
- status changes
- tool events, where observable
- permission / approval events, where observable
- inspect session state
- completion / exit

Important:

- raw output and structured events must both be first-class
- some runtimes expose bytes
- some expose typed events
- some expose both

### 4. Session harness

This is how the outer system extends and configures the inner runtime beyond the base session context.

Examples:

- attach MCP servers
- attach hooks
- attach skills / prompt modules
- attach agent profiles
- generate runtime-specific config files
- translate Franklin concepts into runtime-specific formats

This layer is where runtime-specific adaptation is likely to accumulate.

## Proposed type split

### `SessionContextSpec`

Defines the base execution context.

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

### `HarnessSpec`

Defines how the runtime should be extended.

```ts
interface HarnessSpec {
  mcpServers?: MCPServerSpec[];
  hooks?: HookSpec[];
  skills?: SkillSpec[];
  agentProfile?: AgentProfileSpec;
  runtimeConfig?: Record<string, unknown>;
}
```

### `SessionSpec`

The full session input.

```ts
interface SessionSpec {
  runtime: string;
  context: SessionContextSpec;
  harness?: HarnessSpec;
  initialPrompt?: string;
}
```

### `SessionRef`

Stable identity for start / resume / fork.

```ts
interface SessionRef {
  runtime: string;
  sessionId: string;
}
```

### `SessionConnection`

The active control + observation interface.

```ts
interface SessionConnection {
  send(input: SessionInput): Promise<void>;
  interrupt(): Promise<void>;
  stop(): Promise<void>;
  resize?(size: { cols: number; rows: number }): Promise<void>;
  getState(): Promise<SessionStateSnapshot>;
  onEvent(cb: (event: RuntimeEvent) => void): () => void;
}
```

## Design rules

1. Keep session context separate from harness.
2. Keep control separate from observation even if one object exposes both.
3. Do not assume PTY.
4. Do not assume shell.
5. Do not assume every runtime supports the same event fidelity.
6. Runtime-specific config generation belongs in the harness layer, not the session context layer.

## Open questions

1. Is `initialPrompt` part of `SessionSpec`, or should prompt execution always happen after connection?
2. Should "run one turn" be a first-class primitive, or just a convenience built on `connect + send + await completion`?
3. Does approval mode belong purely in session context, or partly in harness when a runtime expresses it via config files?
4. How much of tool execution should be normalized if some runtimes expose tool events and others do not?

## Suggested next step

Before reorganizing packages, define these four type families more precisely:

- `SessionContextSpec`
- `SessionSpec` / `SessionRef`
- `SessionConnection`
- `RuntimeEvent`

Then map Claude Code, Codex, and OpenCode against them.
