# Franklin Architecture

Status: v3 — middleware stack
Date: 2026-03-13

## Purpose

Franklin is a **middleware stack for ACP-compliant coding agents**.

It does not define its own agent protocol. It builds on the [Agent Client Protocol (ACP)](https://agentclientprotocol.com) — the industry standard for client-to-agent communication backed by JetBrains, Zed, Anthropic, OpenAI, Google, and others.

Franklin provides:

1. **A factory** for spawning ACP agents with a configured middleware stack
2. **Middleware layers** that add capabilities to the raw ACP connection — history, modules, permissions
3. **An agent handle** that gives the app a clean interface over the middleware-wrapped connection

## Beliefs

- The next generation of applications will be built on top of existing agents, not LLMs directly
- Agent runtimes (Claude Code, Codex, Goose, etc.) are commodities — the value is in composition and orchestration
- Applications should define how agents interact with them, not the other way around

## How ACP works

ACP uses JSON-RPC 2.0 over stdio between a client (your app) and an agent (subprocess). There are two interfaces:

**Agent (outbound)** — what the client calls:
- `initialize()` — negotiate capabilities
- `newSession({ cwd, mcpServers })` — create a session
- `prompt({ sessionId, prompt })` — send a message
- `cancel({ sessionId })` — interrupt a turn
- `setMode()`, `setConfigOption()` — runtime configuration

**Client (inbound)** — what the agent calls back:
- `sessionUpdate(notification)` — streaming events (text chunks, tool calls, plans, mode changes)
- `requestPermission(request)` — ask user to approve an action
- `readTextFile(request)` / `writeTextFile(request)` — file I/O
- `terminal/*` — terminal delegation

Franklin's middleware wraps both interfaces.

## Layer model

```
┌───────────────────────────────────────────────┐
│  App (TUI, Electron, web, plugin)             │
├───────────────────────────────────────────────┤
│  AgentHandle (per-agent interface for the app)│
├───────────────────────────────────────────────┤
│  Middleware stack:                             │
│    ┌─ History (persists events, replay)       │
│    ├─ Modules (MCP injection, prompt context) │
│    └─ Permissions (policy-based auto-resolve) │
├───────────────────────────────────────────────┤
│  ACP ClientSideConnection                     │
├───────────────────────────────────────────────┤
│  Agent subprocess (claude-acp, codex-acp, …)  │
└───────────────────────────────────────────────┘
```

### Spawning an agent

```typescript
const agent = await franklin.spawn({
  agent: 'claude-acp',
  cwd: '/project',
  modules: [todoModule, memoryModule],
  permissions: { read: 'allow', execute: 'confirm' },
  history: true,
});
```

Internally, `franklin.spawn()`:
1. Spawns the agent subprocess with merged env vars
2. Creates the raw ACP `ClientSideConnection`
3. Wraps it with the permission middleware (if `permissions` provided)
4. Wraps it with the module middleware (applies `onCreate` / `onPrompt` hooks)
5. Wraps it with the history middleware (if `history: true`)
6. Sends `initialize` + `session/new` (with merged MCP servers from modules)
7. Returns an `AgentHandle`

## Middleware design

### The pattern

ACP has two interfaces: `Agent` (outbound) and `Client` (inbound). A middleware wraps both to intercept traffic in either direction:

```typescript
interface Middleware {
  // Wrap the outbound Agent interface (calls TO the agent)
  wrapAgent?(agent: Agent): Agent;

  // Wrap the inbound Client interface (callbacks FROM the agent)
  wrapClient?(client: Client): Client;
}
```

Middleware composes as decorators — each layer wraps the next. The outermost middleware sees all traffic first.

### History middleware

Intercepts both sides to capture the complete interaction record.

**Wraps Client:**
- `sessionUpdate` — persists all agent output (text, tool calls, plans, mode changes)
- `requestPermission` — records permission requests and decisions

**Wraps Agent:**
- `prompt` — records every prompt the client sends

This gives a full bidirectional log of the conversation. The history is accessible from the handle:

```typescript
agent.history.getEvents();          // full event log
agent.history.getConversation();    // structured prompt → response pairs
agent.history.onEvent(callback);    // react to new events in real-time
```

The app layer (or coordination logic above) can use history to:
- render a conversation view
- feed one agent's output into another agent's prompt
- persist and resume sessions
- provide visual playback

### Module middleware

Intercepts outbound calls to inject behavior at two lifecycle points.

**Wraps Agent:**
- `newSession` — merges MCP servers from all modules into the session config, runs `onCreate` hooks
- `prompt` — runs `onPrompt` hooks to prepend context to each prompt

**Does not wrap Client** — modules extend what gets sent to the agent, not what comes back.

#### Module interface

```typescript
interface FranklinModule {
  name: string;

  // Static config — merged at spawn time
  mcpServers?: McpServerConfig[];
  env?: Record<string, string>;

  // Lifecycle hooks
  onCreate?(ctx: CreateContext): CreateContext | void;
  onPrompt?(ctx: PromptContext): PromptContext | void;
}
```

#### `onCreate(ctx)`

Fires before `session/new` is sent. The module can:
- add MCP servers to the session config
- modify the working directory
- write files to the agent's working directory

```typescript
interface CreateContext {
  cwd: string;
  mcpServers: McpServerConfig[];
  env: Record<string, string>;
}
```

#### `onPrompt(ctx)`

Fires before each `session/prompt` is sent. The module can:
- prepend context to the user's prompt (state, instructions, memory)
- inject resource blocks
- read state from other agents or external systems

```typescript
interface PromptContext {
  sessionId: string;
  prompt: ContentBlock[];
}
```

#### Composition

Modules compose left-to-right. Static config (mcpServers, env) is merged across all modules. Hooks run in sequence — each hook receives the context returned by the previous module.

At spawn time:
1. All `module.env` merged → passed to `child_process.spawn({ env })`
2. All `module.mcpServers` collected
3. Agent process spawned
4. `onCreate` hooks run in order → may add more MCP servers, modify cwd
5. `session/new` sent with final `{ cwd, mcpServers }`

On each prompt:
1. `onPrompt` hooks run in order → may prepend context to prompt
2. `session/prompt` sent with final content

### Permission middleware

Intercepts the inbound `requestPermission` callback to apply policies.

ACP permission requests include standardized fields:
- `ToolKind` — `read`, `edit`, `delete`, `move`, `search`, `execute`, `think`, `fetch`, `other`
- `PermissionOptionKind` — `allow_once`, `allow_always`, `reject_once`, `reject_always`
- `locations` — affected file paths
- `content` — diffs, terminal commands

**Wraps Client:**
- `requestPermission` — evaluates rules against ToolKind and file paths, either auto-resolves or passes through to the app's UI

```typescript
// Declarative permission config
permissions: {
  read: 'allow',           // auto-approve all reads
  edit: 'confirm',         // ask user for edits
  execute: 'confirm',      // ask user for shell commands
  delete: 'deny',          // auto-deny deletions
}
```

The middleware finds the right option by matching on `PermissionOptionKind`, not agent-specific option IDs. This works across agents because the policy matches on ACP-standardized fields.

## Agent handle

The per-agent interface for the app. Sits on top of the middleware stack.

```typescript
interface AgentHandle {
  readonly id: string;
  readonly status: AgentStatus;

  // Send a prompt (module onPrompt hooks run first, history records it)
  prompt(text: string): Promise<void>;

  // Subscribe to events (raw ACP session updates, after middleware)
  on(handler: (event: SessionUpdate) => void): Unsubscribe;

  // Resolve a permission request
  resolvePermission(requestId: string, optionId: string): Promise<void>;

  // Cancel current turn
  cancel(): Promise<void>;

  // History (if enabled)
  history: {
    getEvents(): AgentEvent[];
    getConversation(): ConversationTurn[];
    onEvent(handler: (event: AgentEvent) => void): Unsubscribe;
  };

  // Dispose (kill process, cleanup)
  dispose(): Promise<void>;
}
```

## Example modules

**Todo system** — injects a todo MCP server + current state on each prompt:

```typescript
const todoModule: FranklinModule = {
  name: 'todo',
  mcpServers: [{ type: 'stdio', command: 'franklin-todo-mcp', args: [] }],
  onPrompt(ctx) {
    const todos = loadTodos();
    return {
      ...ctx,
      prompt: [{ type: 'text', text: formatTodos(todos) }, ...ctx.prompt],
    };
  },
};
```

**App-defined tools** — exposes app behavior as MCP tools:

```typescript
const appTools = defineAppTools({
  name: 'my-app',
  tools: {
    getSelection: {
      description: 'Get files selected by the user',
      parameters: z.object({}),
      handler: () => app.getSelectedFiles(),
    },
  },
});
// Returns a FranklinModule with an auto-generated MCP server
```

**Shared memory** — lets multiple agents read/write shared state:

```typescript
const memoryModule = createMemoryModule({ store: '/tmp/shared-memory.json' });
// Injects an MCP server for get/set operations
// onPrompt injects relevant memories as context
```

**Agent spawning** — lets an agent spawn other agents via a tool:

```typescript
const spawnModule = createSpawnModule(franklin);
// Injects an MCP tool: spawn_agent(task, cwd)
// When called, goes back to franklin.spawn() to create a new agent
```

## Multi-agent coordination

Franklin manages multiple agents. Each gets its own ACP connection and middleware stack. Coordination happens at the app level using handles:

```typescript
// Spawn multiple agents
const researcher = await franklin.spawn({ agent: 'claude-acp', cwd: '/project', modules: [memoryModule] });
const implementer = await franklin.spawn({ agent: 'codex-acp', cwd: '/project', modules: [memoryModule] });

// Feed researcher's output into implementer
researcher.history.onEvent((event) => {
  if (event.type === 'turn.completed') {
    const findings = researcher.history.getLastResponse();
    implementer.prompt(`Implement based on this research:\n${findings}`);
  }
});
```

There is no built-in hierarchy or orchestration pattern. The app composes agents however it wants using handles, history, and prompt injection. Opinionated patterns (research → implement → review pipelines, parallel research tasks, agent-spawning-agents) are built as app-level code or as reusable module compositions.

## Package plan

### `packages/franklin` (`franklin`)

The main package. Owns:
- `franklin.spawn()` factory
- Middleware stack composition
- `AgentHandle`
- ACP client management (spawn subprocess, create connection)
- History middleware
- Module middleware
- Permission middleware
- `AgentStore` interface + `InMemoryAgentStore`
- Module interface (`FranklinModule`) and composition logic
- Helper functions: `defineAppTools()`, `createMemoryModule()`, `createSpawnModule()`

Dependencies: `@agentclientprotocol/sdk`

### `apps/tui` (`@franklin/tui`)

Owns:
- Ink/React TUI
- Rendering agent output (uses history events)
- User input routing
- Permission approval UI
- Session list UI
- Demo module compositions

Dependencies: `franklin`

### Dependency graph

```
apps/tui → franklin → @agentclientprotocol/sdk
```

## Migration from v1

### What gets removed

- `packages/managed-agent` — entirely replaced by ACP + middleware
  - Custom protocol types (ManagedAgentCommand, ManagedAgentEvent, etc.)
  - Codex adapter, event-mapper, command-mapper, transport layer
  - All vendor-specific translation code

- `packages/agent-manager` — replaced by `franklin.spawn()` + `AgentHandle`

### What carries forward

- `AgentStore` interface and persistence pattern
- `AgentHandle` concept (rewritten against ACP types)
- TUI app (rewired to new package)
- All code conventions, tooling, and project structure

## Implementation order

### Phase 1: Core

1. Create `packages/franklin`
2. Install `@agentclientprotocol/sdk`
3. Implement `franklin.spawn()` — spawn subprocess, create ACP connection, return handle
4. Implement basic `AgentHandle` — prompt, on, cancel, dispose
5. Prove it works: spawn one ACP agent, send a prompt, stream response to console

### Phase 2: History

1. Implement history middleware — capture both sides of the conversation
2. Add `agent.history` to the handle
3. Persist events via `AgentStore`

### Phase 3: Modules

1. Define `FranklinModule` interface
2. Implement module middleware — `onCreate` and `onPrompt` hook chains
3. Build a simple module (e.g., todo system) to validate the design
4. Implement `defineAppTools()` helper

### Phase 4: Permissions

1. Implement permission middleware — policy evaluation against ToolKind
2. Declarative permission config on spawn

### Phase 5: TUI

1. Rewire TUI to use `franklin.spawn()`
2. Render conversation from history events
3. Permission approval UI
4. Demo: parallel agents with modules

### Phase 6: Polish + launch

1. README with hero GIF
2. Examples directory (hello-world, multi-agent, tool-injection)
3. `npx create-franklin-app` scaffolder
4. Hacker News launch

## Design rules

1. Franklin does not define its own wire protocol. ACP is the wire protocol.
2. Middleware wraps the ACP `Agent` and `Client` interfaces. That is the only extension mechanism.
3. Modules are one type of middleware. History and permissions are others.
4. The app interacts with agents exclusively through `AgentHandle`. Never raw ACP.
5. Franklin does not maintain vendor-specific adapters. ACP adapters are the vendor's responsibility.
6. Keep the module interface minimal. Two hooks (`onCreate`, `onPrompt`) until we prove we need more.
7. History captures both sides of the conversation — agent output AND client prompts.
8. Coordination between agents happens at the app level via handles and history. No built-in hierarchy.

## Open questions

1. Should we split `franklin` into `@franklin/core` + `@franklin/modules` or keep it as one package?
2. Should the history middleware support configurable event filtering (e.g., skip streaming deltas, only store completed items)?
3. How should resume work? Load history from store → spawn new agent process → `session/load` with sessionId?
4. Should there be additional middleware hooks beyond Agent/Client wrapping? (e.g., process lifecycle, error recovery)
5. Should Franklin support the ACP proxy chains RFD when it lands in the TypeScript SDK?
