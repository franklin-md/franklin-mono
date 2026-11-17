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

`inspect().contextTokens` estimates the current projected context: system
instructions, tool schemas and every visible message, including tool results.
Compaction and restore use the existing message projection, so hidden history is
excluded and the summary is counted normally. Pending prompts are added when
checking the next request. `getSession().usage` separately retains reported
lifetime usage across compactions. No token measurements or fingerprints are
stored on history entries; more precise usage-based accounting is deferred.

### Compaction

Franklin core checks the projected context before a fresh prompt and at the
idle `stepEnd` boundary before `continue()`. Compaction summarizes the entire
visible prefix, appends a summary checkpoint, and uses ordinary context sync.
The pending user message is included in budgeting but is appended only after
preparation, so a fresh prompt is not duplicated or lost behind its summary.
No Mini-ACP callback, acknowledgement method, or protocol change is required.

Budgeting resolves the current provider/model's context window from Mini-ACP's
existing Pi resolver, including Franklin-local metadata overrides. Compaction
triggers above `window - min(16384, floor(window / 4))`, reserving at most 16,384
tokens. The window is resolved at every boundary so model changes take effect
on the next check. Configs outside the built-in catalog use a 32,768-token
planning fallback. Automatic and manual summaries use the same resolved window
for chunk budgeting.
Estimates include system instructions, tool schemas, messages and fixed image
allowances. Large instruction/tool/prompt payloads that still exceed the budget
fail before the next inference. These estimates do not guarantee provider token
limits.

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

`edit_file` retains the latest full UTF-8 text snapshot per read path in its
private file record, increasing stored session data by the retained text size.
Exact single-target edits preserve unrelated changes when the full target lines
remain unchanged at the same line numbers; shifted or changed target lines
require a reread. Fuzzy edits, `replace_all`, and legacy or binary hash-only
records still require an unchanged file. File control owns snapshot recording and
whole-file or inclusive line-range freshness checks against the current bytes.
The `last_read` store uses the [file-record codec](src/extensions/filesystem/common/codec.ts).
Unversioned hash strings and snapshot objects enter at schema version 0; migration
wraps hashes as `{ hash }` and preserves existing text snapshots. Version 1
validates snapshot objects. Store preparation persists upgrades before handlers
run; file control receives the current shape. Invalid or future-version records
reject restore without replacing the original data. Validation and file editing
are not atomic.

Freshness checks are advisory and assume the agent follows the tool prompt's
instruction to run `read_file` and `edit_file` sequentially for the same file.
Known limitation: if those calls overlap within one agent, `read_file` can update
that agent's private last-read record after `edit_file` has captured its matching
snapshot. The freshness check can then validate the newer stored snapshot while
the edit uses the older captured text, potentially overwriting user changes.
Private stores isolate agents from each other; they do not serialize calls within
one agent. This overlap is an accepted limitation; sequencing is prompted, not
enforced by the runtime.

`FranklinApp` uses an [internal factory](src/app/agents/factory.ts)
for agent construction, including environment, stores, references and
authentication. `app.agents.create()` uses the app's configured extensions and
participates in chat persistence. For an independent task, supply its extension
list to `app.createAgent()`:

```ts
const runtime = await app.createAgent({
  extensions: [...researchExtensions, answerExtension],
  state: { core: { llmConfig: selection }, env: environmentConfig },
});
```

Each independent agent has its own in-memory store registry and environment. It
does not enter `app.agents` or save session/store files. The caller owns its
lifetime and must call `await runtime.dispose()` in a `finally` block.

Tests that inject a Mini-ACP connector and environment directly can import the
collection factory from the testing entry point:

```ts
import { createFranklinAgents } from '@franklin/agent/testing';
```

The collection factory is exposed only through this testing entry point.

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

### Extension stores

`api.registerStore(key, initial, sharing, codec?)` registers JSON state. Keys may
be strings or typed `StoreKey`s. Omit the fourth argument to retain unversioned
stores: there is no schema validation or migration, and restored values take
precedence over `initial`, even if their shape differs. Existing registrations
and persisted values need no changes. Ordinary extension fields named `version`
or `data` have no special meaning.

Opt into schema validation and migration with the same
[`versioned()` builder](../lib/src/persistence/codec/versioned.ts) used by
[settings](src/settings/schema.ts):

```ts
import { storeKey } from '@franklin/agent';
import { versioned, zodCodec } from '@franklin/lib';
import { z } from 'zod';

const counterKey = storeKey<'counter', { count: number }>('counter');
const counterCodec = versioned()
  .version(0, zodCodec(z.number()))
  .version(1, zodCodec(z.object({ count: z.number() })), count => ({ count }))
  .build();

// Inside an extension:
api.registerStore(counterKey, { count: 0 }, 'shared', counterCodec);
```

The compatibility contract is:

- **Legacy values:** previously unversioned data enters the codec at version 0.
  Declare `.version(0, legacyCodec)` followed by a migration when adopting
  versioning for an existing store. A new store can start at version 1 without a
  legacy step; its `initial` value already uses the current schema.
- **Migration chains:** declare increasing, non-negative integer versions. Each
  later `.version(n, codec, migrate)` supplies a synchronous, pure transformation
  from the previous declared version. Labels need not be consecutive if the
  declared migration bridges that gap. Retain every stored source version you
  support. The codec validates the source and final shape; intermediate steps
  are transformations, not additional validation checkpoints.
- **Persistence:** the store snapshot's optional `schemaVersion` is separate
  from the outer persistence-envelope version. Codec payloads must be JSON.
  First initialization decodes a detached input, validates the result and saves
  and flushes changed snapshots before publishing the runtime. Normal subsequent
  updates retain debounced persistence. Successfully saved upgrades do not rerun
  on the next restore. Validation applies to initial/restored values; `Store.set`
  retains its existing update semantics rather than becoming a schema validator.
- **Identity and sharing:** upgrading retains the store's UUID and live object.
  Concurrent users await the same initialization per reference. Later users reuse
  the ready store without decoding again. Forks retain shared instances and copy
  private stores with their version/codec; children retain shared instances and
  initialize fresh private stores directly at the current schema.
- **Schema lifetime:** a live store keeps its schema until storage is restored
  and the runtime is recreated. Adopting, removing or changing the schema version
  of an initialized reference is rejected. Registrations sharing a reference must
  use compatible codecs for the same version; an equivalent codec may be built
  separately for each registration, but it does not replace the live codec.
- **Failures:** missing source/migration steps, future versions, invalid shapes
  and migration exceptions reject runtime creation with store name/reference and
  error details. Session restore reports the existing `hydrate-failed` issue and
  continues with other sessions. These failures do not replace the original
  store value, metadata or persisted data with defaults. Write rejection also
  prevents the live upgrade from being committed; the filesystem's existing
  write contract does not guarantee crash-safe or atomic replacement.
- **Downgrades:** a versioned reference requires a compatible versioned codec;
  removing the fourth argument is rejected. Older codecs reject future versions.
  Binaries predating this metadata cannot enforce that protection, so binary
  rollback after adopting versioned stores is not supported.

### Relationship to PiMono

Franklin's architecture can be understood as a simplified version of the [PiMono](https://github.com/nichochar/pimono) approach, narrowed to work with ACP agents specifically.

Where PiMono provides a general orchestration framework with fine-grained hooks, Franklin expresses the same orchestration ideas as **extensions to the ACP agent runtime**. The language is built on agents — not on lower-level hooks. This is less granular, but we believe agents (even the ones shipped by labs) are expressive and extensible enough that this level of abstraction is sufficient for powerful orchestration.

The split is:
- **Environment + Spawn + Connect** = the ACP runtime layer (how you create and talk to agents)
- **Extensions + Local MCP** = the orchestration layer (how the application shapes agent behavior)

### Sandboxed commands

Node shell commands share one scheduler per loaded sandbox manager. Commands with
matching shared settings may overlap with different filesystem lists. Incompatible
requests queue until active commands close and finish cleanup. The manager stays
warm between commands. Commands receive the existing OS temporary directory as
`TMPDIR`. See the [runtime notes](../node/src/platform/anthropic/README.md) for
admission policy, deferred cancellation and process-lifetime limits.
