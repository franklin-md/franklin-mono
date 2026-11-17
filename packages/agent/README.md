## Architecture


### Handles

There are three kinds of handles in the system:

**EnvironmentHandle** — a handle to a provisioned environment. The environment is the place where agents exist and execute. Today, an environment is a working directory on the user's OS. In the future, it could be a Docker container, a cloud VM, a git worktree. Environments have their own lifecycle — they are provisioned before agents are spawned and may outlive any single agent. Multiple agents can share an environment.

**Mini-ACP RPC transport** — the data-protocol stream between the application and the agent. One transport is created per agent. The transport is the primitive that crosses process or IPC boundaries and is exposed from `@franklin/mini-acp/rpc`.

**MiniACPClientHandle** — the functional handle to a connected Mini-ACP agent. A `MiniACPConnector` turns a reverse-RPC client handler into this handle by spawning/binding the underlying transport. Core extensions depend on the connector, not on the raw RPC stream.

### Flow

```
┌─────────────┐     ┌────────────────────┐     ┌──────────────┐
│ provision() │────▶│ EnvironmentHandle  │────▶│   spawn()    │
└─────────────┘     └────────────────────┘     └──────┬───────┘
                                                      │
                                           Mini-ACP RPC transport
                                                      │
                                                ┌─────▼───────┐
                                                │ connector() │
                                                └──────┬──────┘
                                                       │
                                               MiniACPClientHandle
                                                       │
                                               ┌────────▼────────┐
                                              │   Extensions /   │
                                              │ Agent Controller  │
                                              └─────────────────┘
```

1. **Provision** an environment — prepare the place where agents will run
2. **Spawn** an agent in that environment — start the process, get back a transport
3. **Connect** to the agent via the connector — wire up typed Mini-ACP commands and reverse RPC handlers
  -  **Control** Mini-ACP session policy through the core agent controller — context sync, prompt shaping, tool execution, observation, and protocol recording

Spawn creates the process and returns the wire; it does not perform Mini-ACP
handshaking. Core connection initializes the bound client once, while context
sync is deferred until the next prompt or an explicit runtime `setLLMConfig()`
call.

### Connect

`connector(handler)` is fundamentally a Mini-ACP operation — it takes the reverse-RPC client handler and produces a typed command surface for the agent.

The separation between transport and connection is important: transports are composable and bridgeable across process boundaries, while connections are bound endpoints. By keeping the JSON-RPC binding in `@franklin/mini-acp/rpc`, different application frameworks (Electron, web, CLI) can bridge the transport across whatever boundary they need and expose only a functional connector to the extension runtime.

### Agent Controller

Core compiles extension registrations into an internal `AgentController`. The
controller owns the application-side Mini-ACP session policy above the raw
connector:

- **Prompt** — syncs context before a turn, builds the model-visible user
  prompt from prompt handlers, drives one Mini-ACP prompt followed by explicit
  continuations, observes stream events, and records the final prompt plus
  assistant updates.
- **Tool** — exposes registered application tool handlers to the agent, falls
  back for unknown tools, notifies tool observers, and records tool calls and
  results.
- **Context** — keeps desired session state separate from the last successfully
  sent Mini-ACP context so retries and patch-only updates are explicit.
- **Usage** — accumulates each terminal's `stepUsage` once for the runtime
  session projection, keeping cumulative `turnEnd.usage` for turn observers.

The controller exposes the reverse-RPC server passed to the connector and binds
the connected `MiniACPClientHandle` into the handle consumed by `CoreRuntime`.
`CoreRuntime` remains the public facade for prompt, cancel, LLM config, tool
enablement, session projection, inspect, and lifecycle events.

The controller consumes `stepEnd` internally, synchronizes ordinary context at
the guaranteed idle boundary, then calls `continue`. `runtime.prompt()` and its
observers still see one logical user turn with one `turnStart` and one
`turnEnd`; no UI step lifecycle or persistence format is added. Cancellation
requested during boundary synchronization is drained by the next continuation
without another provider request.

Runtime terminal codes extend the numeric Mini-ACP code space in
`@franklin/agent`: 10,000–19,999 is reserved for runtime outcomes, beginning
with `RuntimeStopCode.CompactionFailure = 10_000`. `AgentStopCode` accepts
both protocol and runtime codes; `AgentTurnEnd`, stream observers, conversation
blocks and renderers use that wider type. `agentStopCategory()` classifies
runtime failures as `runtime_error`. Use `collectPrompt()` to collect runtime
streams; Mini-ACP's `collect()` continues to collect protocol streams.

The controller owns one active operation and its cancellation signal, shared
with summarization. A preparation failure emits one public
`turnEnd(CompactionFailure)`; user cancellation emits `turnEnd(Cancelled)`.
Before initial inference there is no raw turn to cancel, so this terminal can
occur without a preceding protocol `turnStart`. At a paused boundary the
controller cancels and drains the raw turn before publishing its own terminal.
Previously recorded step usage is retained and the drained cancellation is not
counted again. The operation is released before terminal observers run so a
new prompt can start immediately. Session state owns context/history/usage,
without a separate active-operation lifecycle. Manual compaction's existing
promise API is retained; its extended lifecycle contract remains deferred.

### Context State

The core controller keeps internal context state that splits desired session
state from the last successfully sent Mini-ACP context. A `SessionDraft` is
constructed from a hydrated `SessionSnapshot` and stores the durable session
base: typed history entries, non-secret LLM config, and the session-local tool filter.
Runtime-only contributions such as the registration-built system prompt and live
tool definitions are attached as drafters. `commit()` runs those drafters
against a scratch context, records field revisions, and returns the Mini-ACP
`Context` core wants before the next prompt.

A restored Mini-ACP agent still starts with an empty context, so the first prompt
sync sends a full committed context even when the draft came from a persisted
snapshot. Later syncs derive patches from field revisions that have not been
successfully sent rather than deep-comparing full context objects. For now, a
resolved `setContext` call is treated as success; if Mini-ACP later grows a
separate acknowledgement or retry policy, that policy should live at the send
boundary rather than inside `SessionDraft`. The controller records successful
`setContext` changes, prompt messages, assistant updates, tool results, and turn
usage into this internal state.

The public runtime exposes `getSession()` as a safe projection to
`SessionSnapshot` for consumers that need the dehydrated session view. The
state-module layer uses the same projection for persistence, fork, and
child-session creation. `SessionSnapshot` is distinct from
`Context`: it keeps durable history entries, non-secret LLM config, and usage,
plus the session-local tool filter, while system prompt text, registered tool
schemas, and API keys stay runtime-only. Runtime inspect uses a separate
redacted `inspect()` projection for debug UI so callers never need hidden access
to internal context state.

### Durable History and Projection

**Compatibility change:** `SessionSnapshot.messages: Message[]` is replaced by
`SessionSnapshot.entries: SessionEntry[]`, including the value returned by
`runtime.getSession()`. Each `message` entry wraps its original Mini-ACP message.
A `compaction` checkpoint contains a summary. It hides everything before it from
the model, including any earlier summary. Checkpoints do not delete messages or
earlier checkpoints from the durable history.

The pure [history projector](src/modules/core/history/project.ts) reduces entries
in order with two transitions: a message appends to the visible list; a
checkpoint replaces that list with its summary. Messages after the checkpoint
then accumulate normally. Entries are ordered by their position in the log and
have no IDs. Projection returns Mini-ACP messages directly. Validation checks
nonblank summaries separately from these transitions. Summaries appear as user
messages prefixed with `Conversation summary:`. A later summary must cover the
whole prefix it replaces, including the previous summary. There is no retained-tail boundary.
Summary generation and choosing when to append a checkpoint are outside this
package's history foundation.

Hydration projects entries into the existing Mini-ACP context. Ordinary context
synchronization records successful sends only in the sent-context tracker; it
never writes that projection back into durable history. Failed sends leave the
same entries and pending projection available for retry. Inspect still reports
the last successfully sent model context, with secrets redacted.

An **explicit `messages` patch** through the bound client's `setContext` (or the
internal `SessionDraft.apply`) is a deliberate context reset: it replaces the
durable log with new message entries and removes earlier messages
and checkpoints. An empty array clears the log. Config, system-prompt and tool
patches preserve the log. This retains baseline explicit replacement semantics;
it is not a synchronization or compaction API. Callers must not feed projected
messages into this reset path. Preserving discarded history across explicit
resets would require a separately designed reset event.

The [session codec](src/app/session/codecs/session.ts) writes version 4 and
migrates v1/v2 flat messages by wrapping each message as a typed entry.
V1 defaults to visible details; v2 retains visibility. Both retain config, usage,
stores, environment and the existing tool-filter defaults. V3 introduced roundtrips
of original messages, entry order and checkpoint text. Forks deep-copy the entire log and
inherit config/tool policy while resetting usage. Children start with empty history,
inherit config, and reset usage/tool policy. Projection scans the log on restore
and checkpoint append; checkpoints reduce model context, not storage or snapshot
copy costs. No Mini-ACP protocol, adapter or execution-loop changes are involved.

Version 4 resets all older network policies, including custom rules, to unrestricted
network access (`allowedDomains: ['*']`, `deniedDomains: []`).
See [network rule semantics and compatibility](../lib/src/network/README.md).

### Compaction

Franklin core checks the projected context before a fresh prompt and at the
idle `stepEnd` boundary before `continue()`. Compaction summarizes the entire
visible prefix, appends a summary checkpoint, and uses ordinary context sync.
The pending user message is included in budgeting but is appended only after
preparation, so a fresh prompt is not duplicated or lost behind its summary.
No Mini-ACP callback, acknowledgement method, or protocol change is required.

Budgeting currently uses the existing conservative 8,192-token planning window
and a 6,144-token trigger; this is not the selected model's reported capacity.
Estimates include system instructions, tool schemas, messages and fixed image
allowances. Large instruction/tool/prompt payloads that still exceed the budget
fail before the next inference. Model-specific app-owned budgets remain a
limitation; these estimates do not guarantee provider token limits.

`runtime.compact()` requests manual compaction while no prompt is active and
returns whether a checkpoint was appended. Empty history and an already-current
checkpoint return false. Summary generation uses an isolated connection with no
tools or extension hooks. The chunked summarizer serializes the projected messages
into bounded transcript chunks. Each request summarizes only its new chunk, using
all prior chunk summaries as context; the final checkpoint concatenates those
summaries without rewriting them. A total character budget is divided across
chunks so accumulated summaries remain bounded. These are heuristic limits, not
provider tokenizer guarantees. Transcript serialization omits thinking and replaces
images with placeholders; its different system/tool/message prefix does not reuse
the original conversation cache. Cancellation, failed or
stale summaries cannot append a checkpoint. A failed sync leaves an appended
checkpoint pending for retry. Successful summary usage contributes to session
totals; failed multi-chunk summaries currently omit partial usage. Persistence
retains its existing debounced behavior and raw disk history.

### Extensions

Extensions are the way the application interacts with both the agent and the environment. From an extension developer's perspective, the primary concern is: **how should the application handle the agent's tool requests?**

The generic extension-point, compiler, runtime, and stateless module algebra lives in `@franklin/extensibility`. This package owns the state-module layer and the agent-specific modules built on top of that kernel: core Mini-ACP wiring, environment access, stores, orchestration, and the built-in extensions.

Extensions intercept the ACP flow to augment the agent's behavior from the application side. They cross the boundary between the environment (where the agent runs) and the application (where the user, UI, and app logic live). This is what makes Franklin more than an ACP client library.

The base application runtime also includes the references module. References are
resolved on the application side before prompt submission, so context providers
can materialize files or other app-owned resources without changing the
Mini-ACP prompt protocol.

The mechanism for cross-boundary interaction is **Local MCP**: the application defines tool handlers that are exposed to the agent as MCP servers. The agent invokes tools using the MCP protocol it already speaks; the call crosses from the agent's environment into the application, where the handler executes and returns a result. No custom RPC — just protocol the agent already understands.

Tool handlers return the application-owned execution result. When that raw
value should differ from the model-visible response, the tool registration can
provide `render` to project it into rendered tool-result content. Tool result
observers and conversation blocks keep that model-visible result separate from
the optional raw `output` used for local UI summaries, persistence, and
application handling.

**Current extension API**: Extensions primarily define handlers for agent tool requests — the application-side behavior that the agent can invoke. Future iterations may expose environment mutation methods to extensions as well.

### Relationship to PiMono

Franklin's architecture can be understood as a simplified version of the [PiMono](https://github.com/nichochar/pimono) approach, narrowed to work with ACP agents specifically.

Where PiMono provides a general orchestration framework with fine-grained hooks, Franklin expresses the same orchestration ideas as **extensions to the ACP agent runtime**. The language is built on agents — not on lower-level hooks. This is less granular, but we believe agents (even the ones shipped by labs) are expressive and extensible enough that this level of abstraction is sufficient for powerful orchestration.

The split is:
- **Environment + Spawn + Connect** = the ACP runtime layer (how you create and talk to agents)
- **Extensions + Local MCP** = the orchestration layer (how the application shapes agent behavior)
