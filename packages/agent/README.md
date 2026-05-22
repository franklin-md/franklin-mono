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
                                              │ Decorator Layers  │
                                              └─────────────────┘
```

1. **Provision** an environment — prepare the place where agents will run
2. **Spawn** an agent in that environment — start the process, get back a transport
3. **Connect** to the agent via the connector — wire up typed Mini-ACP commands and reverse RPC handlers
  -  **Extend** handling and events via decorator layers — intercept Mini-ACP flow to add behavior

The caller is responsible for calling `initialize()` and `setContext()` through the client handle. Spawn creates the process and returns the wire; it does not perform Mini-ACP handshaking.

### Connect

`connector(handler)` is fundamentally a Mini-ACP operation — it takes the reverse-RPC client handler and produces a typed command surface for the agent.

The separation between transport and connection is important: transports are composable and bridgeable across process boundaries, while connections are bound endpoints. By keeping the JSON-RPC binding in `@franklin/mini-acp/rpc`, different application frameworks (Electron, web, CLI) can bridge the transport across whatever boundary they need and expose only a functional connector to the extension runtime.

### Decorator Layers

Decorator layers intercept Mini-ACP flow in ordered concerns:

- **Prompt** — handles application behavior around `prompt` calls.
- **Observer** — observes streaming events emitted during a prompt.
- **Tool** — exposes application tool handlers to the agent.
- **System prompt** — contributes system-prompt text before the agent sees the prompt.
- **Tracking** — records prompt and usage information.

Each layer wraps the typed Mini-ACP client/server pair after connect, not the raw transport stream. Some layers use method middleware internally, but the public core module shape is the ordered decorator stack.

### Runtime Agent State

The core runtime keeps an internal `RuntimeAgentState` as the live owner of
prompt-driving state: the last-sent Mini-ACP `Context` and accumulated usage.
The runtime state also owns the registration-built system prompt builder, so
prompt decorators only ask whether a freshly assembled prompt differs from the
tracked Mini-ACP context before sending a patch. Decorators record `setContext`,
prompt messages, assistant updates, tool results, and turn usage into this
internal state object. The public runtime
exposes `getSession()` as a safe projection to `SessionSnapshot` for consumers
that need the dehydrated session view. The state-module layer uses the same
projection for persistence, fork, and child-session creation.
`SessionSnapshot` intentionally remains narrower than `Context`: it keeps
model-visible messages, non-secret LLM config, and usage, while system prompt
text, registered tool schemas, and API keys stay runtime-only.

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
