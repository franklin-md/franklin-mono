## Architecture


### Handles

There are two kinds of handles in the system:

**EnvironmentHandle** — a handle to a provisioned environment. The environment is the place where agents exist and execute. Today, an environment is a working directory on the user's OS. In the future, it could be a Docker container, a cloud VM, a git worktree. Environments have their own lifecycle — they are provisioned before agents are spawned and may outlive any single agent. Multiple agents can share an environment.

**AgentTransport** — a handle to a running agent. This is the communication line between the application and the agent. One transport per agent. The transport is a bidirectional stream of ACP messages. It is the primitive that crosses boundaries — it can be bridged across IPC (e.g., Electron main↔renderer), piped through relays, or connected directly in-memory for testing.

### Flow

```
┌─────────────┐     ┌────────────────────┐     ┌──────────────┐
│  provision() │────▶│  EnvironmentHandle  │────▶│   spawn()    │
└─────────────┘     └────────────────────┘     └──────┬───────┘
                                                      │
                                                AgentTransport
                                                      │
                                                ┌─────▼───────┐
                                                │  connect()   │
                                                └──────┬───────┘
                                                       │
                                                 AgentCommands
                                                       │
                                              ┌────────▼────────┐
                                              │   Extensions /   │
                                              │   Middleware      │
                                              └─────────────────┘
```

1. **Provision** an environment — prepare the place where agents will run
2. **Spawn** an agent in that environment — start the process, get back a transport
3. **Connect** to the agent via the transport — wire up typed ACP commands and event handlers
  -  **Extend** handling and commands via middleware — intercept ACP calls in both directions to add behavior

The caller is responsible for calling `initialize()` and `newSession()` through the commands interface. Spawn creates the process and returns the wire; it does not perform ACP handshaking.

### Connect

`connect(transport, handler)` is fundamentally an ACP operation — it takes a raw message stream and a set of event handlers (the ACP Client interface) and produces a typed command surface (the ACP Agent interface). This is a thin wrapper over the ACP SDK's `ClientSideConnection`.

The separation between transport and connection is important: transports are composable and bridgeable across process boundaries, while connections are bound endpoints. By returning a transport from spawn and deferring connect to the caller, different application frameworks (Electron, web, CLI) can bridge the transport across whatever boundary they need and connect on the application side.

### Middleware

Middleware intercepts ACP calls in both directions:

- **Commands** (outbound, app → agent): `initialize`, `newSession`, `prompt`, `cancel`, etc.
- **Events** (inbound, agent → app): `sessionUpdate`, `requestPermission`, etc.

Each middleware method is a continuation `(params, next) → result` that can inspect, modify, or short-circuit calls before passing them along. Middleware composes symmetrically — in a composed stack, the outermost middleware sees commands first (before they reach the wire) and events last (after inner middleware has processed them).

Middleware operates at the typed command/event level, after connect. It wraps the `AgentCommands` and event handler interfaces, not the raw transport stream.

### Extensions

Extensions are the way the application interacts with both the agent and the environment. From an extension developer's perspective, the primary concern is: **how should the application handle the agent's tool requests?**

Extensions intercept the ACP flow to augment the agent's behavior from the application side. They cross the boundary between the environment (where the agent runs) and the application (where the user, UI, and app logic live). This is what makes Franklin more than an ACP client library.

The mechanism for cross-boundary interaction is **Local MCP**: the application defines tool handlers that are exposed to the agent as MCP servers. The agent invokes tools using the MCP protocol it already speaks; the call crosses from the agent's environment into the application, where the handler executes and returns a result. No custom RPC — just protocol the agent already understands.

**Current extension API**: Extensions primarily define handlers for agent tool requests — the application-side behavior that the agent can invoke. Future iterations may expose environment mutation methods to extensions as well.

### Relationship to PiMono

Franklin's architecture can be understood as a simplified version of the [PiMono](https://github.com/nichochar/pimono) approach, narrowed to work with ACP agents specifically.

Where PiMono provides a general orchestration framework with fine-grained hooks, Franklin expresses the same orchestration ideas as **extensions to the ACP agent runtime**. The language is built on agents — not on lower-level hooks. This is less granular, but we believe agents (even the ones shipped by labs) are expressive and extensible enough that this level of abstraction is sufficient for powerful orchestration.

The split is:
- **Environment + Spawn + Connect** = the ACP runtime layer (how you create and talk to agents)
- **Extensions + Local MCP** = the orchestration layer (how the application shapes agent behavior)
