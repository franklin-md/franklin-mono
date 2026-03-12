# Runtime Core Research

Status: first-pass research
Date: 2026-03-12
Scope: Claude Code, OpenAI Codex, OpenCode

## Goal

Define the lowest-level runtime/session abstraction for an Ink-first app without baking in Franklin-specific knowledge-work behavior too early.

The key question is not "which CLI do we wrap?" but "what is the thinnest stable contract that can normalize the CLIs we care about?"

## Working conclusion

The runtime core should normalize two different shapes of runtime:

- terminal-first runtimes
- API/server-first runtimes

That means the core should not assume:

- a PTY
- a shell
- a human-visible terminal
- a single process

It should instead normalize:

- session lifecycle
- input/output events
- tool/permission state when observable
- background task status
- resume/fork semantics when supported

## Recommended package split

### `@franklin/agent-runtime-core`

Owns:

- `RuntimeAdapter`
- `SessionManager`
- normalized event model
- capability discovery
- transcript/message model
- session IDs and resume/fork abstractions

Does not own:

- MCP packaging
- skills/prompts/hooks policy
- knowledge store
- host UI

### `@franklin/process-runtime`

Owns:

- direct process spawning
- stdio transport
- PTY transport
- buffering
- resize
- signals / cancellation / cleanup
- readiness detection

This package should expose transport implementations, not product semantics.

### `@franklin/knowledge-runtime`

Owns:

- MCP/tool harness
- skills
- hooks
- context injection
- workspace-specific runtime policies

This package depends on runtime core. Runtime core should not depend on this package.

## Capability matrix

This table reflects what the public docs clearly show as of 2026-03-12.

| Runtime      | Start/resume sessions                                                          | Structured API/events                                                                                                                             | Extensibility                                                                                              | MCP support                                                                              | Notes for Franklin                                                                 |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Claude Code  | Yes, including `--continue`, `--resume`, and SDK resume flows                  | Stronger than a pure terminal wrapper: official JSON / stream-json formats and typed SDK events exist, but the product still feels terminal-first | Strong: hooks, skills, slash commands, subagents, output styles                                            | Strong client support; can also run as an MCP server                                     | Good target if we normalize both structured events and terminal-native interaction |
| OpenAI Codex | Yes; one-shot `exec` plus richer App Server thread/session lifecycle           | Strong and increasingly server-first: App Server uses bidirectional JSON-RPC over stdio/JSONL with UI-ready notifications                         | Strong: `AGENTS.md`, skills, automations, MCP; official hook-like surface is less clear than Claude Code's | Strong MCP client support; MCP-server direction exists but looks secondary to App Server | Most important signal is that OpenAI is moving toward a structured non-PTY harness |
| OpenCode     | Yes, with explicit `--continue`, `--session`, `--fork`, plus rich session APIs | Strongest explicit structured surface: headless HTTP server, SDK, SSE, OpenAPI, and JSON event output                                             | Strong: agents, commands, plugins, MCP, permissions                                                        | Strong                                                                                   | Best external reference for separating TUI from runtime server cleanly             |

## Runtime-by-runtime notes

### Claude Code

What is clearly documented:

- CLI/SDK support resume flows.
- Non-interactive usage supports structured JSON output modes and typed SDK event streams.
- Hooks run around tool use, prompts, stop events, subagent stop, session start, and session end.
- `SessionStart` explicitly runs when Claude Code starts a new session or resumes an existing session.
- Skills are now the main prompt extension model and can run in subagents.
- Claude Code supports MCP broadly and can also expose itself as an MCP server via `claude mcp serve`.

Implications:

- Claude Code is a strong target for a terminal-first adapter.
- Hooks and skills should live above runtime core, not inside it.
- Resume exists, but the clean integration surface is still primarily CLI-centered in the docs reviewed here.

### OpenAI Codex

What is clearly documented:

- Codex exists as a local CLI, IDE integration, desktop app, cloud app, and SDK.
- OpenAI's App Server architecture introduces a richer structured control surface with bidirectional JSON-RPC over stdio/JSONL and durable thread/session concepts.
- Official docs say the app supports multiple agents in parallel, worktrees, skills, automations, and git features.
- The open-source repo shows `AGENTS.md` support, non-interactive usage, MCP configuration, and experimental MCP-server mode.

What remains less clear from the official source set reviewed here:

- how much of App Server is intended as the long-term public integration surface for third-party hosts versus OpenAI's own product stack
- whether there is an official hook surface comparable to Claude Code's documented hooks

Implications:

- The Codex adapter should not be designed as "PTY-first".
- The runtime core must allow richer adapters now, not only later.
- Avoid overfitting the abstraction to terminal bytes when the vendor direction is moving toward structured protocol events.

### OpenCode

What is clearly documented:

- The CLI supports `--continue`, `--session`, and `--fork`.
- It can emit raw JSON events in CLI mode.
- `opencode serve` exposes a headless HTTP server with OpenAPI.
- The SDK is generated from that server surface.
- The server exposes session creation, prompting, status, fork, abort, permissions, and global SSE events.

Implications:

- OpenCode is the clearest proof that the runtime core should support API-native adapters, not only process wrappers.
- If Franklin eventually wants a daemon/backend model, OpenCode is the best external reference point.

## Recommended core abstractions

### Capabilities

The adapter should advertise capabilities explicitly.

```ts
type SessionCapability =
  | "resume"
  | "fork"
  | "structured_events"
  | "permissions"
  | "tools"
  | "mcp_client"
  | "mcp_server"
  | "subagents"
  | "headless"
  | "pty_preferred"
  | "stdio_supported";
```

### Session lifecycle

```ts
interface RuntimeAdapter {
  id: string;
  capabilities: SessionCapability[];
  createSession(input: CreateSessionInput): Promise<SessionRef>;
  resumeSession(input: ResumeSessionInput): Promise<SessionRef>;
  forkSession?(input: ForkSessionInput): Promise<SessionRef>;
  connect(session: SessionRef): Promise<SessionConnection>;
}
```

### Session connection

```ts
interface SessionConnection {
  send(input: SessionInput): Promise<void>;
  interrupt(): Promise<void>;
  stop(): Promise<void>;
  resize?(size: { cols: number; rows: number }): Promise<void>;
  onEvent(cb: (event: RuntimeEvent) => void): () => void;
}
```

### Runtime events

```ts
type RuntimeEvent =
  | { type: "session.started"; sessionId: string }
  | { type: "session.ready"; sessionId: string }
  | { type: "session.output"; stream: "stdout" | "stderr" | "pty"; text: string }
  | { type: "session.message"; role: "user" | "assistant" | "system"; text: string }
  | { type: "session.permission"; id: string; state: "pending" | "resolved" }
  | { type: "session.status"; status: "idle" | "running" | "waiting" | "exited" }
  | { type: "session.error"; message: string }
  | { type: "session.exited"; exitCode?: number; signal?: string };
```

The important design choice is that `session.output` and `session.message` are separate. Some runtimes only give you bytes. Some give you richer message objects. The core needs both.

## Design rules

1. Runtime core should normalize capabilities, not pretend all runtimes are identical.
2. PTY should be optional and probably secondary. Some adapters will prefer it; others should actively avoid it.
3. Shell should be an escape hatch, not the default. Prefer direct process launch.
4. Session identity should be first-class. Do not hide resume/fork behind UI-only state.
5. Hooks, skills, MCP harnessing, and context injection belong above runtime core.

## What to research next

1. Codex adapter specifics
   Need a tighter pass over official Codex docs/repo to decide whether Franklin should target CLI `exec`, App Server, or both.
2. PTY policy
   Define exactly when Franklin needs PTY rather than stdio.
3. Approval/permission model
   Decide how much of runtime-native permission state belongs in the normalized event model.

## Sources

- Claude Code SDK: https://docs.anthropic.com/s/claude-code-sdk
- Claude Code hooks: https://code.claude.com/docs/en/hooks
- Claude Code skills and slash commands: https://code.claude.com/docs/en/slash-commands
- Claude Code MCP: https://code.claude.com/docs/en/mcp
- Claude Code output styles: https://docs.anthropic.com/en/docs/claude-code/output-styles
- OpenAI Codex repo: https://github.com/openai/codex
- OpenAI Codex App Server architecture: https://openai.com/index/unlocking-the-codex-harness/
- OpenAI MCP docs: https://platform.openai.com/docs/docs-mcp
- OpenAI skills catalog: https://github.com/openai/skills
- OpenAI help, Codex overview: https://help.openai.com/en/articles/11369540-icodex-in-chatgpt
- OpenAI help, Codex CLI getting started: https://help.openai.com/en/articles/11096431
- OpenCode agents: https://opencode.ai/docs/agents/
- OpenCode CLI: https://opencode.ai/docs/cli/
- OpenCode MCP servers: https://opencode.ai/docs/mcp-servers/
- OpenCode plugins: https://opencode.ai/docs/plugins/
- OpenCode server: https://opencode.ai/docs/server/
- OpenCode SDK: https://opencode.ai/docs/sdk/
