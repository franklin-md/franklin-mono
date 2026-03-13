# Migration to v3

Status: planning
Date: 2026-03-13

## Goal

Replace the custom protocol layer (`managed-agent`, `agent-manager`) with a thin wrapper over the ACP SDK. The result is a simpler, standards-based architecture where Franklin adds value through composable middleware — not protocol translation.

## Phase 1: `packages/agent` — core connection

Create a new package that wraps the ACP SDK into a single unit managing: subprocess lifecycle, outbound agent calls, and inbound client callbacks.

### Transport

Abstracts the communication channel. Owns the subprocess and provides the ACP `Stream`.

```typescript
interface Transport {
	readonly stream: Stream; // ACP SDK's { readable, writable }
	dispose(): Promise<void>; // kill the process, clean up
}
```

**StdioTransport** — the first (and likely only) implementation:

```typescript
class StdioTransport implements Transport {
	readonly stream: Stream;
	private process: ChildProcess;

	constructor(options: {
		command: string;
		args?: string[];
		cwd?: string;
		env?: Record<string, string>;
	});
	async dispose(): Promise<void>;
}
```

Spawns a child process, converts Node streams to web streams via `Readable.toWeb()` / `Writable.toWeb()`, and creates an `ndJsonStream`. Stderr is inherited for debugging. `dispose()` kills the process and waits for exit.

### AgentConnection

Wraps a `Transport` + ACP `ClientSideConnection`. Provides a clean interface that both the app and middleware operate on.

```typescript
class AgentConnection {
	constructor(transport: Transport, handler: Client);

	// --- Agent methods (outbound, proactive) ---
	// Every method from ACP's Agent interface, delegating to ClientSideConnection:
	initialize(params: InitializeRequest): Promise<InitializeResponse>;
	newSession(params: NewSessionRequest): Promise<NewSessionResponse>;
	loadSession(params: LoadSessionRequest): Promise<LoadSessionResponse>;
	listSessions(params: ListSessionsRequest): Promise<ListSessionsResponse>;
	prompt(params: PromptRequest): Promise<PromptResponse>;
	cancel(params: CancelNotification): Promise<void>;
	setSessionMode(
		params: SetSessionModeRequest,
	): Promise<SetSessionModeResponse>;
	setSessionConfigOption(
		params: SetSessionConfigOptionRequest,
	): Promise<SetSessionConfigOptionResponse>;
	authenticate(params: AuthenticateRequest): Promise<AuthenticateResponse>;

	// --- Lifecycle ---
	get signal(): AbortSignal;
	get closed(): Promise<void>;
	dispose(): Promise<void>; // kills transport
}
```

The `handler: Client` parameter is the ACP SDK's `Client` interface — the app provides implementations for the inbound callbacks:

- `sessionUpdate(params)` — streaming events (required)
- `requestPermission(params)` — permission approval (required)
- `readTextFile?(params)` — file reads (optional)
- `writeTextFile?(params)` — file writes (optional)
- `createTerminal?(params)` — terminal creation (optional)
- `terminalOutput?`, `waitForTerminalExit?`, `killTerminal?`, `releaseTerminal?` — terminal lifecycle (optional)

Internally, `AgentConnection` creates a `ClientSideConnection` and delegates all Agent methods to it. Critically, the `Client` handler is accessed via a **late-binding closure** — the internal `ClientSideConnection` calls `this.handler.sessionUpdate(...)` at invocation time, not at construction time. This means the handler reference can be replaced after construction, which is what makes middleware wiring possible (see Phase 2).

### Testing

Integration tests that connect to a real ACP agent (e.g., Codex via `codex --acp` or similar). Tests skip when the agent binary is not available. The harness should be simple — directly runnable, no complex mocking infrastructure.

## Phase 2: Middleware

Middleware has the same shape as the connection — it implements all Agent methods (outbound) and all Client callbacks (inbound). The base middleware forwards everything unchanged.

### BaseMiddleware

```typescript
class BaseMiddleware {
	protected next: AgentConnection | BaseMiddleware;

	constructor(next: AgentConnection | BaseMiddleware);

	// --- Agent methods (outbound) — default: forward to next ---
	initialize(params: InitializeRequest): Promise<InitializeResponse> {
		return this.next.initialize(params);
	}
	newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
		return this.next.newSession(params);
	}
	prompt(params: PromptRequest): Promise<PromptResponse> {
		return this.next.prompt(params);
	}
	cancel(params: CancelNotification): Promise<void> {
		return this.next.cancel(params);
	}
	// ... all other Agent methods

	// --- Client callbacks (inbound) — default: forward to next ---
	sessionUpdate(params: SessionNotification): Promise<void> {
		return this.next.sessionUpdate(params);
	}
	requestPermission(
		params: RequestPermissionRequest,
	): Promise<RequestPermissionResponse> {
		return this.next.requestPermission(params);
	}
	// ... all other Client methods

	// --- Lifecycle — delegate ---
	get signal(): AbortSignal {
		return this.next.signal;
	}
	get closed(): Promise<void> {
		return this.next.closed;
	}
	dispose(): Promise<void> {
		return this.next.dispose();
	}
}
```

To create a middleware, extend `BaseMiddleware` and override only what you need:

```typescript
class ContextInjector extends BaseMiddleware {
	// Wrap an outbound call — proactive side stays proactive
	async prompt(params: PromptRequest): Promise<PromptResponse> {
		const enriched = {
			...params,
			prompt: [{ type: 'text', text: 'Use the todo tool' }, ...params.prompt],
		};
		return super.prompt(enriched);
	}
	// Everything else passes through unchanged
}

class EventLogger extends BaseMiddleware {
	// Wrap an inbound callback — reactive side stays reactive
	async sessionUpdate(params: SessionNotification): Promise<void> {
		console.log(params.update.sessionUpdate);
		return super.sessionUpdate(params);
	}
}
```

### Stacking

Middleware stacks as a chain. Outbound calls flow app → outermost middleware → ... → innermost middleware → transport. Inbound callbacks flow the reverse direction.

```
App
 ↕
EventLogger (middleware)
 ↕
ContextInjector (middleware)
 ↕
AgentConnection (transport + ACP)
 ↕
Agent subprocess
```

### Wiring

Works like a network stack. You build from the bottom up:

```typescript
// 1. Create the transport (bottom of stack)
const transport = new StdioTransport({ command: 'codex', args: ['--acp'] });

// 2. Create the connection — pass the app's handler initially
const conn = new AgentConnection(transport, appHandler);

// 3. Stack middleware on top, each wrapping the layer below
const inner = new ContextInjector(conn);
const outer = new EventLogger(inner);

// 4. App uses the outermost layer
outer.prompt({ ... });
```

**Outbound** (prompt goes down): `app → outer.prompt() → inner.prompt() → conn.prompt() → agent`

Each middleware's `prompt()` calls `super.prompt()` which forwards to `this.next.prompt()`, chaining down to the connection.

**Inbound** (callbacks come back up): `agent → conn → inner.sessionUpdate() → outer.sessionUpdate() → app handler`

This works because each middleware's constructor replaces the inner layer's client handler with itself. When the middleware receives the callback, it does its work, then calls `super.sessionUpdate()` which forwards to the original handler. The call stack naturally unwinds through the chain.

The `AgentConnection` enables this by using a late-binding closure for its client handler (see Phase 1). When `ContextInjector` wraps the connection, it swaps `conn.handler` to point to itself. When `EventLogger` wraps `ContextInjector`, it swaps `inner.handler` to point to itself. The chain is: agent process → `ClientSideConnection` calls `conn.handler` → `EventLogger.sessionUpdate()` → `ContextInjector.sessionUpdate()` → app handler.

```
App (provides handler)
 ↕
EventLogger         — outer.prompt() / outer.sessionUpdate()
 ↕
ContextInjector     — inner.prompt() / inner.sessionUpdate()
 ↕
AgentConnection     — conn.prompt()  / conn.handler delegates inbound
 ↕
StdioTransport      — subprocess + ACP wire protocol
 ↕
Agent process
```

Each layer sees both directions of traffic. Override only what you need — everything else passes through.

## Phase 3: Strip old packages

Once `packages/agent` is proven with real integration tests:

1. Hollow out the TUI — replace `agent-manager` and `managed-agent` imports with `@franklin/agent`
2. Delete `packages/managed-agent` entirely (custom protocol, Codex adapter, transports, message types)
3. Delete `packages/agent-manager` entirely (AgentManager, AgentHandle, InMemoryAgentStore)
4. Update root tsconfig references, workspace config

### What carries forward from old code

- TUI components (layout, sidebar, conversation view, input bar) — rewired to new event types
- `eventsToConversation` concept — rewritten against ACP `SessionUpdate` variants
- Store/persistence pattern — reimplemented as middleware if needed (ACP has `session/load` for replay)

### What gets deleted

- All custom protocol message types (`ManagedAgentCommand`, `ManagedAgentEvent`, etc.)
- Codex adapter, command-mapper, event-mapper
- Both transport implementations (process + direct)
- JSON-RPC stdio layer (replaced by ACP SDK's `ndJsonStream`)
- `AgentManager` class (replaced by direct `AgentConnection` creation)
- `AgentHandle` class (replaced by `AgentConnection`)
- `AdapterFactory` pattern

## Phase 4: TUI rewire

Rewire `apps/tui` to create `AgentConnection` instances directly. The TUI provides the `Client` handler (renders session updates, shows permission prompts). Session management becomes simpler — each session is an `AgentConnection`.

## Decisions made

1. **One connection per session.** ACP supports multiple sessions per connection, but we keep it 1:1. Simpler to reason about, matches the TUI's model, can relax later.
2. **`AgentConnection` does not implement the ACP `Agent` interface.** It's a superset (adds lifecycle: `dispose`, `signal`, `closed`). No need to constrain to their interface.
3. **Middleware wiring uses the natural call stack.** Build from bottom up. Each middleware wraps the layer below and replaces its handler. Inbound callbacks unwind through the chain. No special composition function needed.

## Open questions

1. **Error propagation** — what happens when the subprocess crashes? The transport's stream ends, `signal` aborts, `closed` resolves. Should the connection expose an error event or is `signal`'s abort reason sufficient?
2. **BaseMiddleware handler swapping mechanism** — the constructor needs to intercept the inner layer's handler and replace it. Should this be a public `handler` property on `AgentConnection`, or a `setHandler()` method, or something else? Leaning toward a public property for simplicity.
