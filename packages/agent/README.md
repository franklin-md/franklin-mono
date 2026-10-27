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
  prompt from prompt handlers, forwards the prompt, observes stream events, and
  records the final prompt plus assistant updates.
- **Tool** — exposes registered application tool handlers to the agent, falls
  back for unknown tools, notifies tool observers, and records tool calls and
  results.
- **Context** — keeps desired session state separate from the last successfully
  sent Mini-ACP context so retries and patch-only updates are explicit.
- **Usage** — accumulates turn usage from `turnEnd` events for the runtime
  session projection.

The controller exposes the reverse-RPC server passed to the connector and binds
the connected `MiniACPClientHandle` into the handle consumed by `CoreRuntime`.
`CoreRuntime` remains the public facade for prompt, cancel, LLM config, tool
enablement, session projection, inspect, and lifecycle events.

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
child-session creation. `SessionSnapshot` intentionally remains narrower than
`Context`: it keeps history entries, non-secret LLM config, and usage,
plus the session-local tool filter, while system prompt text, registered tool
schemas, and API keys stay runtime-only. Runtime inspect uses a separate
redacted `inspect()` projection for debug UI so callers never need hidden access
to internal context state.

### Compaction

History contains message entries and compaction entries, each with a stable ID.
A compaction stores its summary and the first retained message ID. Projection
replaces the preceding prefix with a summary message while preserving the raw
entries. Repeated compaction summarizes the previous summary plus the newly
discarded prefix. Forks copy history and reset usage; children start with empty
history. Version 3 session files migrate earlier message arrays automatically.

Core automatically checks context before each provider request, including requests
inside a tool loop. It reserves 16,384 tokens (a quarter of the window for smaller
models), and retains up to 20,000 recent tokens, reduced to a third of the available
budget for smaller models. Cuts preserve tool-call/result groups. The assembled
user prompt, system prompt and tool schemas participate in the estimate.

`runtime.compact()` requests manual compaction and returns whether a checkpoint
was appended. Summary generation uses an isolated connection with tools disabled,
without extension prompt/stream hooks or recursive compaction. Large transcripts
are summarized in bounded chunks, carrying the summary forward. Thinking and
image payloads are omitted from summaries; original entries retain them.
Summary usage contributes to session totals.

Cancellation, generation failure, stale history and summaries that do not reduce
context cannot append a checkpoint. A failed context synchronization leaves the
checkpoint pending for retry. Automatic preparation fails clearly when the
remaining context still exceeds its budget; it does not retry provider overflows.
Persistence retains its existing debounced snapshot behavior. Compaction reduces
model context, not retained disk history.

See [Pi's compaction design](https://pi.dev/docs/latest/compaction) for the retained
boundary pattern and [Mini-ACP context preparation](../mini-acp/README.md#context-preparation-agent--application)
for the inference checkpoint contract.

### Extensions

`FranklinApp` uses the shared [`createFranklinAgents`](src/app/agents/factory.ts)
factory for agent construction, including environment, stores, references and
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

### HTTP document references

Hosts can register `createHTTPReferenceExtension()` before their PDF/image/text
materializers to read public document URLs through `read_file`. HTTP resolution
uses the environment's web permissions on each redirect, then delegates bytes
and the original selector to the existing document handler. Remote reads do not
enter the filesystem edit-authorization store. HTML pages use `fetch_url`.

Document downloads default to 60 seconds of inactivity, 15 minutes total,
64 MiB and five redirects. `documentDownloadPolicy` supplies the two timing
limits through the Configuration API. Hosts can contribute a partial override
with `documentDownloadPolicy.of({ idleTimeoutMs, totalTimeoutMs })`, or read live
settings with `.compute(...)`. `FranklinApp` contributes its saved
`settings.documentDownloads` at lowest priority for both chat and independent
agents. The HTTP handler reads and validates a fresh policy at the start of
each download; running transfers retain their original limits. Hosts may still
override `maxBytes` and `maxRedirects` on `createHTTPReferenceExtension`.

Page selection bounds returned PDF content independently of the download limit.
`WebFetchRequest.idleTimeoutMs` crosses IPC as a number. Node transports enforce
it from connection setup, reset it when headers or nonempty body chunks arrive,
and abort stalled streams with received/expected byte counts when available.
`WebFetchRequest.deadline` is
an absolute Unix timestamp in milliseconds, preserved across redirects and IPC;
Node transports abort connection setup and body reads when it expires.
`maxResponseBytes` is enforced while streaming, rejecting oversized responses
rather than returning partial document bytes.

Hosts may pass an optional `HTTPReferenceCache` as `cache` to
`createHTTPReferenceExtension({ cache })`. The host owns its lifetime and shares
it across agents. Cache keys exclude page/line selectors and display labels, and
include the normalized URL, network policy and download limits. Downloads still
use the environment's permissions, with a captured policy checked on every
redirect; changed policies cannot reuse another policy's cached bytes or pending
request. Parsing, selectors and source attribution run normally on cached bytes.

`@franklin/node` provides `createHTTPReferenceCache(directory, options)` with a
24-hour maximum lifetime and a 512 MiB disk budget, configurable with `ttlMs` and
`maxBytes`. It stores complete successful downloads in atomic binary files,
combines concurrent loads, and evicts least recently used entries. Shorter server
freshness limits apply. Responses requiring validation, prohibiting storage,
setting cookies or declaring `Vary` are not retained. Expired or corrupt entries
are downloaded again; cache storage failures do not fail successful reads.
`cache.clear()` removes stored entries and prevents pending older downloads from
repopulating them. This source cache does not retain extracted PDF text, OCR or
screenshots, and does not implement conditional revalidation or download resume.

Node shell commands share the process-global sandbox only while their effective
configurations match. Different configurations queue until running commands close.
Proxy decisions reuse Franklin's web network policy, including its empty-allowlist
semantics, and commands receive the existing OS temporary directory as `TMPDIR`.
