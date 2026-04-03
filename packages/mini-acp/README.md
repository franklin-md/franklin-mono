# Mini-ACP Design
*Mini-ACP is sometimes aliased to Mu and may change name because of its divergence from ACP (in addition to its simplification)*

## Overview and Philosophy
> Mini-ACP defines a protocol for communication between any Agent and Application.

This is a bi-directional protocol where both parties engage at different times as both Client and Server to each other. The protocol does not mandate a codec for messages, but JSON-RPC 2.0 is suggested. It requires a transport protocol like websocket or stdio pipes.

At a glance:
- **Agents have state but there is no session persistence on the agent's side**:
  - Throughout the protocol, the agent's `Context` changes as it keeps track of:
    - **Explicit Changes through `setContext`**, as would be expected from applications that implement sessions through `fork` and `resume` semantics over the `History`, and from applications wishing to change the current `LLMConfig`
    - **Implicit Changes during `prompt`**, in which the context grows with new user messages, assistant messages, and tool invocations.
  - **The Context is empty at the start of the protocol**
- **Externalized Tool Execution**
  - All tool requests must be sent to the application to handle.

## Motivation
Below, we explain the reasons why Mini-ACP was developed, including mention of previous work that inspired its creation.

- [ ] Just as LLMs have converged towards a single interaction flow (the OpenAI completions standard), agents may also benefit from converging towards a single interaction flow. The core loop — prompt, stream, tool call, resume — is shared by virtually every agent framework. Mini-ACP codifies this loop as a wire protocol rather than a library abstraction.

### Protocolization
- Cross-boundary communication (remote, local, in-process, in separate process, etc.)
- Agnostic of agent implementation (although less of a reason because agents are so minimal there aren't many degrees of freedom), but could be useful when some LLMs are run locally (the agent is in charge of the lifecycle of the LLM too)


### Minimal Agent
- [ ] The domains of definition (the SDK for implementing apps that talk with agents looks like an ACP-compliant agent, but the entire state and behaviour is within the developer's control and can be programmatically queried and mutated)
  - [ ] Why session persistence is not an agent responsibility: Because the agent receives its full context via `setContext`, it is a pure function of `(Ctx, UserMessage) → Stream`. Any process can restore a session by replaying the context — no agent-side state machine, no lock-in to a particular storage model. The application owns persistence, and the agent is none the wiser.
  - [ ] Why tool execution is better served in application code: The agent holds only tool schemas, never implementations. When it needs a tool, it calls back to the application via reverse RPC (`toolExecute`). This means: the application controls what the agent can do; tools have access to platform resources (filesystem, network, UI) that an isolated agent process cannot; new tools can be added without restarting or redeploying the agent; and different sessions can wire different tool implementations to the same agent.
    - [ ] Developments in common coding agent workflows should not require a change to the protocol. For example, file editing, todo tracking, agent spawning, and filesystem search are all implemented as application-side extensions that register tools and observe the stream — none required new protocol methods or message types.
    - [ ] Makes no assumption on capabilities of agent environment (the application advertises its own capabilities), unlike the contract of `clientCapabilities` in ACP:
      - [ ] https://agentclientprotocol.com/protocol/file-system
      - [ ] https://agentclientprotocol.com/protocol/terminals
      - [ ] https://agentclientprotocol.com/protocol/slash-commands
      - [ ] https://agentclientprotocol.com/protocol/agent-plan
  - [ ] That Context Management and Tool Control are all that is needed to extend an agent. The full extension surface reduces to: intercepting/mutating context before it reaches the agent (`setContext`, `prompt`), registering tools that execute locally and whose schemas are injected into context, and observing the stream as side effects. There is no other extension point.
- Problem Agnostic
- [ ] Secure by design (the application is in charge of the security model)


## Protocol at a Glance

### State Machine

```
[Uninitialized]
    │ initialize()
    ▼
[Initialized]
    │ setContext()
    ▼
[Ready] ◄──────────────────────┐
    │ prompt()                  │
    ▼                           │
[Turning] ── stream events ──► │
    │   ▲                       │
    │   └─ toolExecute ◄──►    │
    │      (reverse RPC)        │
    │                           │
    │ TurnEnd / cancel          │
    └───────────────────────────┘
```

Transitions:
- `setContext` MAY be called any number of times in the `Ready` state.
- `prompt` transitions from `Ready` to `Turning`. A new `prompt` MUST NOT be sent while a turn is active.
- `TurnEnd` or stream termination transitions from `Turning` back to `Ready`.
- `cancel` MAY be sent during `Turning`. See [Cancellation](#cancellation).
- `setContext` during `Turning` is currently #unspecified.

### Phase 1: Initialization

Once a transport has been established between the two parties, the client sends `initialize`.

```
Client ──── initialize({}) ────► Agent
Client ◄──────── {} ────────── Agent
```

The agent MUST respond with an empty result. After initialization, the agent's context is empty.

Currently, `InitializeParams` and `InitializeResult` are both empty objects. Future versions of the protocol MAY use this exchange for version negotiation and capability advertisement between the two parties.


### Phase 2: Context Setup

Before the first prompt (and whenever the application needs to change the agent's context), the client sends `setContext` with a partial `Ctx`.

```
Client ──── setContext({ ctx }) ────► Agent
Client ◄──────────── {} ────────────  Agent
```

The `Ctx` type represents the full state needed to drive an agent turn:

```
Ctx {
  history: History
  tools:   ToolDefinition[]
  config?: LLMConfig
}
```

**`History`** — the conversation state:
```
History {
  systemPrompt: string       // The system-level instruction
  messages:     Message[]    // The ordered conversation history
}
```

**`ToolDefinition`** — a tool the agent may invoke:
```
ToolDefinition {
  name:        string                   // Unique tool identifier
  description: string                   // Human-readable purpose
  inputSchema: Record<string, unknown>  // JSON Schema for arguments
}
```

**`LLMConfig`** — optional model configuration:
```
LLMConfig {
  model?:     string         // Model identifier
  provider?:  string         // Provider identifier
  reasoning?: ThinkingLevel  // off | minimal | low | medium | high | xhigh
  apiKey?:    string         // Provider API key (resolved by auth layer)
}
```

`setContext` performs a **shallow field replacement**: each top-level field present in the partial replaces the corresponding field in the agent's current context. Fields not included in the partial are left unchanged. This allows the client to update tools without resending the full history, or change the model without touching the conversation.


### Phase 3: Prompt

A turn begins when the client sends `prompt` with a `UserMessage`. The agent responds with a stream of events and terminates the stream when the turn is complete.

```
Client ──── prompt({ message: UserMessage }) ────► Agent
Client ◄──── StreamEvent* ──────────────────────── Agent
Client ◄──── (stream terminal response) ────────── Agent
```

#### Messages

Three message roles exist, each constrained to specific content types:

| Role       | text | thinking | image | toolCall |
| ---------- | ---- | -------- | ----- | -------- |
| user       | ✓    |          | ✓     |          |
| assistant  | ✓    | ✓        | ✓     | ✓        |
| toolResult | ✓    |          | ✓     |          |

Content block types:
- **`TextContent`** — `{ type: "text", text: string }`
- **`ThinkingContent`** — `{ type: "thinking", text: string }` — model reasoning, typically hidden from the user
- **`ImageContent`** — `{ type: "image", data: string, mimeType: string }`
- **`ToolCallContent`** — `{ type: "toolCall", id: string, name: string, arguments: Record<string, unknown> }`

#### Stream Events

The prompt stream emits a sequence of `StreamEvent` values. There are four event types:

**`TurnStart`** — signals the turn has begun. This is always the first event emitted after a `prompt`:
```
TurnStart {
  type: "turnStart"
}
```

**`Chunk`** — a streaming delta, emitted as tokens arrive from the LLM:
```
Chunk {
  type:      "chunk"
  messageId: string        // Groups chunks belonging to the same message
  role:      MessageRole   // The role of the message being streamed
  content:   Content       // A single content delta (text or thinking)
}
```

**`Update`** — a complete assistant message, emitted when a logical message is finished. This is the authoritative form — it represents the full message that the preceding chunks were building towards. The `messageId` ties the update to its chunks: if chunks were emitted for this `messageId`, the message content MUST be the concatenation of those chunk deltas (grouped by content type). Streamed updates carry assistant text/thinking/image content only; tool calls and tool results do not appear as stream events.
```
Update {
  type:      "update"
  messageId: string        // Must match the messageId of any preceding chunks
  message:   Message       // The complete assistant message
}
```

**`TurnEnd`** — signals the turn is complete:
```
TurnEnd {
  type:         "turnEnd"
  stopCode:     StopCode      // Integer code indicating why the turn ended
  stopMessage?: string        // Optional human-readable detail
}
```

A typical stream for a simple text response:
```
TurnStart { "turnStart" }
Chunk { "chunk", messageId: "m1", role: "assistant", content: { type: "text", text: "Hello" } }
Chunk { "chunk", messageId: "m1", role: "assistant", content: { type: "text", text: " world" } }
Update { "update", messageId: "m1", message: { role: "assistant", content: [{ type: "text", text: "Hello world" }] } }
TurnEnd { "turnEnd", stopCode: 100 }
```

The `Update` message text `"Hello world"` is exactly the concatenation of the two chunk deltas `"Hello"` + `" world"`. Every chunk's `messageId` (`"m1"`) matches the update's `messageId`, and no chunks for `"m1"` appear after the update.
- [ ] Usage information (token counts, cost) is not currently included in `TurnEnd`. This is a known gap.

#### Tool Execution

When the LLM decides to invoke a tool, the agent initiates a reverse RPC call to the client:

```
Agent ──── toolExecute({ call: ToolCall }) ────► Client
Agent ◄──── ToolResult ────────────────────────── Client
```

Where:
```
ToolCall {
  type:      "toolCall"
  id:        string                    // Correlation ID for matching result to call
  name:      string                    // The tool name (from ToolDefinition)
  arguments: Record<string, unknown>   // Arguments matching the tool's inputSchema
}

ToolResult {
  toolCallId: string                             // Must match the ToolCall.id
  content:    Array<TextContent | ImageContent>   // The tool's output
  isError?:   boolean                            // Whether the tool execution failed
}
```

A single `prompt` call may trigger multiple tool executions. The agent's internal LLM loop continues after each tool result — cycling through `(LLM call → tool call → tool result → LLM call)` — until the LLM produces a final response or a stop condition is reached. The entire sequence is part of a single prompt turn, but tool calls/results flow through reverse RPC rather than the prompt stream.

#### Turn End

The turn ends when the agent emits a `TurnEnd` event and closes the stream. The `stopCode` is an integer indicating why:

| Code | Name                   | Category   | Meaning                                          |
| ---- | ---------------------- | ---------- | ------------------------------------------------ |
| 100  | `Finished`             | finished   | The agent completed its response normally         |
| 101  | `Cancelled`            | finished   | The client requested cancellation                 |
| 200  | `LlmError`             | llm_error  | Generic / unclassified LLM error                  |
| 210  | `ProviderNotSpecified` | llm_error  | No provider in LLMConfig                          |
| 211  | `ProviderNotFound`     | llm_error  | Provider string does not match any known provider |
| 212  | `ModelNotSpecified`    | llm_error  | No model in LLMConfig                             |
| 213  | `ModelNotFound`        | llm_error  | Model not available for the given provider        |
| 220  | `ProviderError`        | llm_error  | Provider runtime error (rate limit, ban, etc.)    |
| 230  | `MaxTokens`            | llm_error  | The LLM's token limit was reached                 |

Codes are grouped by range: 1xx = `finished` (the turn completed), 2xx = `llm_error` (the turn could not complete). The category is derived from the code, never stored separately.

After `TurnEnd`, the agent's context has been implicitly updated with all messages produced during the turn (the user message, assistant messages, tool calls, and tool results).

#### Cancellation

The client MAY send a `cancel` notification at any time during an active turn:

```
Client ──── cancel({}) ────► Agent (notification, no response)
```

The agent SHOULD attempt to stop the current turn. However, the protocol makes no guarantees about the timeliness or completeness of cancellation. Specifically:

- In-flight tool executions MAY or MAY NOT complete before the turn ends.
- The agent SHOULD eventually emit a `TurnEnd` with `stopCode: Cancelled (101)`, but the timing is #unspecified.
- The client MUST NOT assume the stream has ended until the stream is actually terminated (i.e., the terminal response is received).

#### Shutdown

There is no explicit shutdown phase in the protocol. Session teardown is delegated to the underlying transport. Closing the transport connection implicitly terminates any active turn and releases resources on both sides.


## Spec Table

Each row is a testable assertion over a protocol transcript. IDs are semantic so new points can be added without reordering.

### Initialization

| ID | Description | Level |
|----|-------------|-------|
| `init-send-exists` | `initialize` send must exist | MUST |
| `init-receive-exists` | Agent must respond to `initialize` | MUST |
| `init-is-first` | `initialize` must be the first message sent | MUST |
| `init-exactly-once` | `initialize` must be sent exactly once | MUST |

### Context Setup

| ID | Description | Level |
|----|-------------|-------|
| `ctx-before-first-prompt` | `setContext` must precede the first `prompt` | MUST |
| `ctx-receive-exists` | Agent must respond to each `setContext` | MUST |
| `ctx-after-init` | `setContext` must not be sent before `initialize` completes | MUST |

### Turn Lifecycle

| ID | Description | Level |
|----|-------------|-------|
| `turn-starts-with-turn-start` | The first stream event after every `prompt` must be a `turnStart` | MUST |
| `turn-ends-with-turn-end` | Every `prompt` must eventually be followed by a `turnEnd` | MUST |
| `no-overlapping-prompts` | `prompt` must not be sent while a turn is active | MUST |
| `prompt-after-init` | `prompt` must not be sent before `initialize` completes | MUST |
| `turn-end-is-terminal` | No stream events (`chunk`, `update`) after `turnEnd` within a turn | MUST |

### Stream Events

| ID | Description | Level |
|----|-------------|-------|
| `one-turn-end-per-turn` | Every turn has exactly one `turnEnd` | MUST |
| `stop-code-valid` | `turnEnd.stopCode` must be a valid `StopCode` enum value | MUST |
| `chunk-has-message-id` | Every `chunk` has a `messageId` and `role` | MUST |
| `update-has-message-id` | Every `update` has a non-empty `messageId` | MUST |
| `update-has-message` | Every `update` contains a complete `message` | MUST |
| `chunk-has-matching-update` | Every chunk `messageId` must have a corresponding `update` with the same `messageId` | MUST |
| `chunks-precede-update` | All `chunk`s for a `messageId` precede the corresponding `update` | MUST |
| `update-message-matches-chunks` | If chunks exist for a `messageId`, the update message content is their concatenation | MUST |

### Tool Execution

| ID | Description | Level |
|----|-------------|-------|
| `tool-result-follows-execute` | Every `toolExecute` receive is followed by a `toolResult` send | MUST |
| `tool-result-id-matches` | `toolResult.toolCallId` must match the preceding `toolExecute`'s `call.id` | MUST |
| `tool-execute-during-turn` | `toolExecute` only occurs during an active turn | MUST |
| `tool-name-in-context` | Invoked tool name must exist in a prior `setContext` tools array | MUST |

### Message Content

| ID | Description | Level |
|----|-------------|-------|
| `user-content-types` | User messages may only contain `text` and `image` content blocks | MUST |
| `assistant-content-types` | Assistant stream updates may only contain `text`, `thinking`, `image` blocks | MUST |
| `tool-result-content-types` | `toolResult` messages may only contain `text` and `image` content blocks | MUST |

### Cancellation

| ID | Description | Level |
|----|-------------|-------|
| `cancel-during-active-turn` | `cancel` must only be sent during an active turn | MUST |
| `cancel-stop-code` | After `cancel`, the turn should end with `stopCode: Cancelled (101)` | SHOULD |


## Support for other Standards
The ecosystem has slowly converged on a series of standards for agent subsystems, such as MCP. This section discusses **how such capabilities may be reimplemented on top of this protocol**.

### Session Management

Because the agent is stateless — it receives its full context on every interaction — session management is an application-level concern built entirely on top of `setContext`.

#### Persistence
An application persists a session by snapshotting the current `Ctx` (plus any application-side state such as extension stores). Restoring a session is simply: `initialize` → `setContext(savedCtx)` → ready for the next `prompt`. No special protocol support is needed.

- https://agentclientprotocol.com/rfds/session-delete
- https://agentclientprotocol.com/rfds/session-resume
- https://agentclientprotocol.com/rfds/session-list

#### Forking
Forking a session is creating a new agent connection and calling `setContext` with a copy of the parent's context (potentially with modifications). The agent has no concept of lineage — it just receives a context.

- https://agentclientprotocol.com/rfds/session-fork


### MCP
- [ ] How MCP tool servers can be bridged: the application connects to MCP servers, translates their tool schemas into `ToolDefinition[]` for `setContext`, and routes `toolExecute` calls back through the MCP client.

### Skills
- [ ] How application-defined skills (compound actions, slash commands) can be implemented as tools or as prompt-layer middleware without protocol changes.

### AGENTS.md
- [ ] How agent metadata and discovery could be layered on top of initialization or as an out-of-band mechanism.

### Mutliple Agents

### Shared Context

## Potential Problems and Todos
- [ ] Is it expensive to send full history on fork?
- [ ] Mid turn notification / ctx changing
  - [ ] May need to relax tool response type
- [x] Error semantics spelled out (StopCode integer enum with categories)
- [ ] Spell out authentication model, but feels like apikey can really be enough
- [ ] 
