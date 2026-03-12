# Vendor Message Type Research

Status: first-pass research
Date: 2026-03-12
Scope: Franklin app-facing protocol design, Codex app-server, Claude Code stream-json

## Why this note exists

Franklin already commits to a managed-agent architecture:

- the app should not talk directly to vendor runtimes
- the managed agent should expose a stable Franklin protocol
- vendor-specific protocol details should stay inside adapters

This note narrows one open question:

- what message shapes do Codex and Claude actually expose today
- which parts should Franklin normalize directly
- which parts should remain adapter-private

## Franklin architecture read

After reading the `franklin/` folder, the split is clear:

- `franklin/ARCHITECTURE.md` is the current commitment
- `franklin/docs/managed-agent-protocol.md` is the current planning draft
- `franklin/docs/research-*.md` are support notes

The important implementation reality is that the current Obsidian plugin is still PTY-first:

- [`obsidian-plugin/src/lib/task-runtime-manager.ts`](/Users/afv/git/franklin-plugin/obsidian-plugin/src/lib/task-runtime-manager.ts) spawns a PTY and delegates to runtime adapters
- [`obsidian-plugin/src/lib/runtime-adapters/codex.ts`](/Users/afv/git/franklin-plugin/obsidian-plugin/src/lib/runtime-adapters/codex.ts) launches `codex ...`
- [`obsidian-plugin/src/lib/runtime-adapters/claude.ts`](/Users/afv/git/franklin-plugin/obsidian-plugin/src/lib/runtime-adapters/claude.ts) launches `claude ...`

So Franklin currently has:

- an intended managed-agent architecture in `franklin/`
- a present PTY integration in `obsidian-plugin/`

That gap matters, because Codex and Claude do not expose equally rich control surfaces.

## Codex app-server

### Evidence used

- local CLI help from `codex app-server --help`
- locally generated JSON schema via `codex app-server generate-json-schema --out /tmp/codex-app-schema`
- locally generated TS bindings via `codex app-server generate-ts --out /tmp/codex-app-ts`
- OpenAI's App Server article: https://openai.com/index/unlocking-the-codex-harness/

### Transport shape

Codex app-server is the strongest fit for Franklin's intended managed-agent layer:

- long-lived process
- bidirectional JSON-RPC-like protocol over stdio
- JSONL framing
- request/response plus notifications
- server-initiated requests for approvals and interactive follow-ups

OpenAI calls this a JSON-RPC-lite design. Franklin should still use strict JSON-RPC 2.0 internally and treat Codex's wire shape as adapter-specific.

### Client request methods

The generated `ClientRequest` type currently includes:

- `initialize`
- `thread/start`
- `thread/resume`
- `thread/fork`
- `thread/archive`
- `thread/unarchive`
- `thread/unsubscribe`
- `thread/name/set`
- `thread/metadata/update`
- `thread/compact/start`
- `thread/rollback`
- `thread/list`
- `thread/loaded/list`
- `thread/read`
- `turn/start`
- `turn/steer`
- `turn/interrupt`
- `review/start`
- `model/list`
- `experimentalFeature/list`
- `skills/list`
- `skills/remote/list`
- `skills/remote/export`
- `skills/config/write`
- `plugin/list`
- `plugin/install`
- `plugin/uninstall`
- `app/list`
- `mcpServer/oauth/login`
- `config/mcpServer/reload`
- `mcpServerStatus/list`
- `account/login/start`
- `account/login/cancel`
- `account/logout`
- `account/read`
- `account/rateLimits/read`
- `feedback/upload`
- `config/read`
- `config/value/write`
- `config/batchWrite`
- `configRequirements/read`
- `externalAgentConfig/detect`
- `externalAgentConfig/import`
- `command/exec`
- `command/exec/write`
- `command/exec/terminate`
- `command/exec/resize`
- `getConversationSummary`
- `getAuthStatus`
- `gitDiffToRemote`
- `fuzzyFileSearch`

For Franklin v1, the core subset is much smaller:

- `initialize`
- `thread/start`
- `thread/resume`
- `thread/fork`
- `turn/start`
- `turn/steer`
- `turn/interrupt`
- `thread/read`
- maybe `thread/list`

### Server notification methods

The generated `ServerNotification` type currently includes:

- `error`
- `thread/started`
- `thread/status/changed`
- `thread/archived`
- `thread/unarchived`
- `thread/closed`
- `thread/name/updated`
- `thread/tokenUsage/updated`
- `thread/compacted`
- `turn/started`
- `turn/completed`
- `turn/diff/updated`
- `turn/plan/updated`
- `item/started`
- `item/completed`
- `item/agentMessage/delta`
- `item/plan/delta`
- `item/reasoning/summaryTextDelta`
- `item/reasoning/summaryPartAdded`
- `item/reasoning/textDelta`
- `item/commandExecution/outputDelta`
- `item/commandExecution/terminalInteraction`
- `item/fileChange/outputDelta`
- `item/mcpToolCall/progress`
- `rawResponseItem/completed`
- `hook/started`
- `hook/completed`
- `serverRequest/resolved`
- `skills/changed`
- `mcpServer/oauthLogin/completed`
- `account/updated`
- `account/rateLimits/updated`
- `app/list/updated`
- `model/rerouted`
- `deprecationNotice`
- `configWarning`
- `fuzzyFileSearch/sessionUpdated`
- `fuzzyFileSearch/sessionCompleted`
- realtime thread notifications
- Windows-specific notifications

The important point is structural, not just enumerative:

- Codex speaks in `thread`
- then `turn`
- then `item`
- then item-specific deltas

That hierarchy is a strong candidate for Franklin's normalized protocol.

### Server-initiated request methods

The generated `ServerRequest` type currently includes:

- `item/commandExecution/requestApproval`
- `item/fileChange/requestApproval`
- `item/permissions/requestApproval`
- `item/tool/requestUserInput`
- `item/tool/call`
- `mcpServer/elicitation/request`
- `account/chatgptAuthTokens/refresh`
- `applyPatchApproval`
- `execCommandApproval`

This is the most important difference between Codex and Claude:

- Codex is not just a stream of events
- Codex can stop and ask the host for a decision

That means Franklin's managed-agent protocol should support server-initiated requests, not only notifications.

### Structural data types

Codex's generated TS is useful because it shows the semantic model directly.

`TurnStartParams`:

- targets a `threadId`
- takes `input: Array<UserInput>`
- allows overrides for `cwd`, approval policy, sandbox policy, model, effort, summary, personality, output schema, collaboration mode

`UserInput` variants:

- `text`
- `image`
- `localImage`
- `skill`
- `mention`

`ThreadItem` variants:

- `userMessage`
- `agentMessage`
- `plan`
- `reasoning`
- `commandExecution`
- `fileChange`
- `mcpToolCall`
- `dynamicToolCall`
- `collabAgentToolCall`
- `webSearch`
- `imageView`
- `imageGeneration`
- review-mode entries
- `contextCompaction`

This is already much closer to a UI-ready event model than a plain CLI transcript.

## Claude Code stream-json

### Evidence used

- local CLI help from `claude --help`
- local Claude binary string inspection from `/Users/afv/.local/share/claude/versions/2.1.74`
- Anthropic SDK docs surfaced via search:
  - https://docs.anthropic.com/en/docs/claude-code/sdk
  - related CLI help text around `stream-json`, `input-format`, and `include-partial-messages`

### Transport shape

Claude's structured non-interactive surface is:

- `--print`
- `--output-format stream-json`
- optional `--input-format stream-json`
- optional `--include-partial-messages`
- optional `--replay-user-messages`

This is a JSONL event stream over stdio, not a bidirectional RPC surface.

That means Claude is best modeled as:

- a streaming event runtime
- optionally with streaming stdin
- but not natively as a host-driven request/response protocol

### Top-level message types

The Anthropic docs and local binary inspection align on the main message families:

- `system`
- `user`
- `assistant`
- `result`

The docs specifically reference:

- `system/init`
- `user`
- `assistant`
- `result/success`
- `result/error_*`

From local binary inspection, Claude also clearly emits result subtypes including:

- `success`
- `error_during_execution`

The binary also includes `--max-turns`, so Franklin should assume more than one error-like result subtype can appear. It is safer to model Claude's result subtype as an open string family, not a closed enum.

### Message content observations

From local binary inspection:

- assistant messages contain `message.content`
- assistant content elements include at least `text` and `tool_use`
- result messages include a `subtype`
- tool activity is embedded inside assistant content rather than surfaced as a separate host-level RPC request

This is a crucial contrast with Codex:

- Codex has explicit `item/*` lifecycle notifications and separate approval requests
- Claude collapses more of the rollout into streamed message events

### Operational flags that matter to Franklin

The local CLI confirms:

- `--input-format text | stream-json`
- `--output-format text | json | stream-json`
- `--include-partial-messages`
- `--replay-user-messages`
- `--continue`
- `--resume`
- `--fork-session`
- `--session-id`

So Claude does support:

- structured event output
- streamed input
- resume/fork/session identity

But it does not expose the same host-control surface as Codex app-server.

## Direct comparison

### Codex

Codex is:

- session-oriented
- host-integrated
- event-rich
- approval-aware
- structurally hierarchical: thread -> turn -> item -> delta

Franklin should map fairly directly onto this shape.

### Claude

Claude is:

- stream-oriented
- CLI-first even when structured
- message-centric rather than item-centric
- weaker on host-initiated and server-initiated control symmetry

Franklin should adapt Claude into a richer managed-agent shape rather than copy Claude's wire format.

## What Franklin should normalize

### Strong recommendation

Franklin's managed-agent protocol should normalize these concepts:

- session
- turn
- item
- message delta
- tool/procedure progress
- permission request
- completion
- error

That gives Franklin a shape that matches Codex naturally and that Claude can be translated into.

### Suggested normalized command surface

- `agent.start`
- `agent.resume`
- `agent.fork`
- `agent.inspect`
- `turn.start`
- `turn.steer`
- `turn.interrupt`
- `permission.resolve`

Franklin should not force Claude or Codex wire-level names upward into the app.

### Suggested normalized event surface

- `thread.started`
- `thread.status.changed`
- `turn.started`
- `turn.completed`
- `item.started`
- `item.delta`
- `item.completed`
- `permission.requested`
- `permission.resolved`
- `output.raw`
- `error`
- `exited`

### Suggested normalized item kinds

Franklin should likely start with these item kinds:

- `user_message`
- `assistant_message`
- `plan`
- `reasoning`
- `command_execution`
- `file_change`
- `tool_call`

Optional later kinds:

- `dynamic_tool_call`
- `collab_agent_call`
- `web_search`
- `image`
- `review`

## Adapter implications

### Codex adapter

Codex adapter can be close to a thin translator:

- map `thread/*`, `turn/*`, `item/*` directly into Franklin events
- proxy server-initiated requests into Franklin permission/user-input requests
- preserve Codex ids for thread, turn, item where possible

### Claude adapter

Claude adapter will need synthetic structure:

- synthesize a Franklin session from Claude session id
- synthesize turn boundaries from Claude result cycles
- synthesize item ids for assistant message, tool activity, and tool results
- convert `assistant` and `result` stream messages into Franklin item lifecycle events

This is the main reason Franklin should not use Claude's wire format as its own protocol.

## Design conclusion

The synthesis is:

- Codex should be Franklin's reference model for control semantics
- Claude should be Franklin's reference model for lightweight structured streaming
- Franklin should normalize to a session/turn/item protocol with explicit server-initiated request support

If Franklin does that:

- Codex integration remains natural
- Claude remains possible without terminal scraping
- the app gets one stable model instead of vendor-specific message trees

## Recommended next design step

Write the first Franklin protocol draft around:

- `session`
- `turn`
- `item`
- `request/response`
- `notification`

and explicitly decide:

- which ids Franklin owns versus preserves from vendors
- whether `permission.requested` is a notification or a request
- whether `item.delta` should be typed by item kind or remain generic

## Sources

- Franklin architecture:
  - [`franklin/ARCHITECTURE.md`](/Users/afv/git/franklin-plugin/franklin/ARCHITECTURE.md)
  - [`franklin/docs/managed-agent-protocol.md`](/Users/afv/git/franklin-plugin/franklin/docs/managed-agent-protocol.md)
  - [`franklin/docs/research-communication-protocols.md`](/Users/afv/git/franklin-plugin/franklin/docs/research-communication-protocols.md)
- Current plugin implementation:
  - [`obsidian-plugin/src/lib/task-runtime-manager.ts`](/Users/afv/git/franklin-plugin/obsidian-plugin/src/lib/task-runtime-manager.ts)
  - [`obsidian-plugin/src/lib/runtime-adapters/codex.ts`](/Users/afv/git/franklin-plugin/obsidian-plugin/src/lib/runtime-adapters/codex.ts)
  - [`obsidian-plugin/src/lib/runtime-adapters/claude.ts`](/Users/afv/git/franklin-plugin/obsidian-plugin/src/lib/runtime-adapters/claude.ts)
- Local Codex protocol extraction:
  - generated under `/tmp/codex-app-schema`
  - generated under `/tmp/codex-app-ts`
- Vendor docs:
  - OpenAI, "Unlocking the Codex Harness": https://openai.com/index/unlocking-the-codex-harness/
  - Anthropic, Claude Code SDK: https://docs.anthropic.com/en/docs/claude-code/sdk
