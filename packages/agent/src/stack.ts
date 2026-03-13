import type {
	// Outbound (Agent) types
	AuthenticateRequest,
	AuthenticateResponse,
	CancelNotification,
	CreateTerminalRequest,
	CreateTerminalResponse,
	InitializeRequest,
	InitializeResponse,
	KillTerminalRequest,
	KillTerminalResponse,
	ListSessionsRequest,
	ListSessionsResponse,
	LoadSessionRequest,
	LoadSessionResponse,
	NewSessionRequest,
	NewSessionResponse,
	PromptRequest,
	PromptResponse,
	ReadTextFileRequest,
	ReadTextFileResponse,
	ReleaseTerminalRequest,
	ReleaseTerminalResponse,
	RequestPermissionRequest,
	RequestPermissionResponse,
	SessionNotification,
	SetSessionConfigOptionRequest,
	SetSessionConfigOptionResponse,
	SetSessionModeRequest,
	SetSessionModeResponse,
	TerminalOutputRequest,
	TerminalOutputResponse,
	WaitForTerminalExitRequest,
	WaitForTerminalExitResponse,
	WriteTextFileRequest,
	WriteTextFileResponse,
} from '@agentclientprotocol/sdk';
import { RequestError } from '@agentclientprotocol/sdk';

import type { AgentConnection } from './connection.js';

// ---------------------------------------------------------------------------
// AgentStack — unified interface for both outbound and inbound methods
// ---------------------------------------------------------------------------

export interface AgentStack {
	// --- Outbound (app → agent) ---
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

	// --- Inbound (agent → app) ---
	sessionUpdate(params: SessionNotification): Promise<void>;
	requestPermission(
		params: RequestPermissionRequest,
	): Promise<RequestPermissionResponse>;
	readTextFile(params: ReadTextFileRequest): Promise<ReadTextFileResponse>;
	writeTextFile(params: WriteTextFileRequest): Promise<WriteTextFileResponse>;
	createTerminal(
		params: CreateTerminalRequest,
	): Promise<CreateTerminalResponse>;
	terminalOutput(
		params: TerminalOutputRequest,
	): Promise<TerminalOutputResponse>;
	releaseTerminal(
		params: ReleaseTerminalRequest,
	): Promise<ReleaseTerminalResponse | undefined>;
	waitForTerminalExit(
		params: WaitForTerminalExitRequest,
	): Promise<WaitForTerminalExitResponse>;
	killTerminal(
		params: KillTerminalRequest,
	): Promise<KillTerminalResponse | undefined>;

	// --- Lifecycle ---
	dispose(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Middleware — partial AgentStack where each method gets (params, next)
// ---------------------------------------------------------------------------

/**
 * A middleware intercepts methods on the AgentStack. Each overridden method
 * receives the original params plus a `next` function that calls the next
 * layer in the chain. Call `next(params)` to forward, or return directly to
 * short-circuit.
 */
export type Middleware = {
	[K in keyof AgentStack]?: (
		params: Parameters<AgentStack[K]>[0],
		next: (params: Parameters<AgentStack[K]>[0]) => ReturnType<AgentStack[K]>,
	) => ReturnType<AgentStack[K]>;
};

// ---------------------------------------------------------------------------
// compose() — wire the middleware chain
// ---------------------------------------------------------------------------

const OUTBOUND_METHODS = [
	'initialize',
	'newSession',
	'loadSession',
	'listSessions',
	'prompt',
	'cancel',
	'setSessionMode',
	'setSessionConfigOption',
	'authenticate',
] as const;

const INBOUND_METHODS = [
	'sessionUpdate',
	'requestPermission',
	'readTextFile',
	'writeTextFile',
	'createTerminal',
	'terminalOutput',
	'releaseTerminal',
	'waitForTerminalExit',
	'killTerminal',
] as const;

// Internal function type — intentionally permissive. Type safety comes from
// the public AgentStack/Middleware types, not from the chain-building internals.
type ChainFn = (...args: any[]) => any;

/**
 * Builds a chain of middleware functions around a terminal function.
 * Each middleware receives (...originalArgs, next) where next calls the
 * next layer. Middlewares are wrapped from last to first: the first
 * middleware in the array is outermost (runs first).
 */
function buildChain(
	terminal: ChainFn,
	middlewareFns: Array<ChainFn | undefined>,
): ChainFn {
	let chain: ChainFn = terminal;
	for (let i = middlewareFns.length - 1; i >= 0; i--) {
		const mw = middlewareFns[i];
		if (mw) {
			const next = chain;
			// Always call mw(params, next) — params is the first arg (or undefined for dispose).
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			chain = (params: unknown) => mw(params, next);
		}
	}
	return chain;
}

/**
 * Composes a middleware stack around an AgentConnection.
 *
 * @param connection - The AgentConnection (terminal for outbound, source for inbound)
 * @param middlewares - Ordered array. mw[0] is outermost (closest to app).
 * @param handler - App's terminal handlers for inbound callbacks. Partial — only
 *                  implement methods you handle (e.g. sessionUpdate + requestPermission).
 * @returns An AgentStack for the app to use for outbound calls.
 */
export function compose(
	connection: AgentConnection,
	middlewares: Middleware[],
	handler: Partial<AgentStack>,
): AgentStack {
	const stack = {} as Record<string, ChainFn>;

	// --- Outbound: app → mw[0] → mw[1] → ... → connection ---
	for (const method of OUTBOUND_METHODS) {
		const terminal: ChainFn = ((p: never) =>
			connection[method](p)) as unknown as ChainFn;
		const mwFns = middlewares.map((mw) => mw[method] as ChainFn | undefined);
		stack[method] = buildChain(terminal, mwFns);
	}

	// --- Inbound: connection → mw[N-1] → ... → mw[0] → handler ---
	for (const method of INBOUND_METHODS) {
		const terminal: ChainFn = ((p: never) => {
			const fn = handler[method] as ChainFn | undefined;
			if (!fn) throw RequestError.methodNotFound(method);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return fn(p);
		}) as unknown as ChainFn;
		// Reverse order: mw[0] wraps handler (innermost), mw[N-1] is outermost
		const mwFns = [...middlewares]
			.reverse()
			.map((mw) => mw[method] as ChainFn | undefined);
		stack[method] = buildChain(terminal, mwFns);
	}

	// --- Lifecycle: dispose chains through middlewares then connection ---
	{
		const terminal: ChainFn = (() =>
			connection.dispose()) as unknown as ChainFn;
		const mwFns = middlewares.map((mw) => mw.dispose as ChainFn | undefined);
		stack['dispose'] = buildChain(terminal, mwFns);
	}

	// --- Wire inbound chains to the connection's handler ---
	// Type safety is enforced at the public AgentStack/Middleware boundary.
	// The internal chain dispatch uses ChainFn, so we cast back here.
	/* eslint-disable @typescript-eslint/no-unsafe-return */
	connection.handler = Object.fromEntries(
		INBOUND_METHODS.map((method) => [
			method,
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			(p: never) => stack[method]!(p),
		]),
	) as unknown as typeof connection.handler;
	/* eslint-enable @typescript-eslint/no-unsafe-return */

	return stack as unknown as AgentStack;
}
