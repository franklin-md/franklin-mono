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
base: messages, non-secret LLM config, and the session-local tool filter.
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
`Context`: it keeps model-visible messages, non-secret LLM config, and usage,
plus the session-local tool filter, while system prompt text, registered tool
schemas, and API keys stay runtime-only. Runtime inspect uses a separate
redacted `inspect()` projection for debug UI so callers never need hidden access
to internal context state. Future persisted state may become a richer superset of
what Mini-ACP receives, including compaction points or other checkpoints
projected into the next Mini-ACP context.

### Extensions

Extensions are the way the application interacts with both the agent and the environment. From an extension developer's perspective, the primary concern is: **how should the application handle the agent's tool requests?**

The generic extension-point, compiler, runtime, and stateless module algebra lives in `@franklin/extensibility`. This package owns the state-module layer and the agent-specific modules built on top of that kernel: core Mini-ACP wiring, environment access, stores, orchestration, and the built-in extensions.

Extensions intercept the ACP flow to augment the agent's behavior from the application side. They cross the boundary between the environment (where the agent runs) and the application (where the user, UI, and app logic live). This is what makes Franklin more than an ACP client library.

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
