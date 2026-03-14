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
// Method lists
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

const ALL_METHODS = [
	...OUTBOUND_METHODS,
	...INBOUND_METHODS,
	'dispose',
] as const;

// Internal function type — intentionally permissive. Type safety comes from
// the public AgentStack/Middleware types, not from the chain-building internals.
type ChainFn = (...args: any[]) => any;

/**
 * Builds a chain of middleware functions around a terminal function.
 * Each middleware receives (params, next) where next calls the next layer.
 * Middlewares are wrapped from last to first: the first middleware in the
 * array is outermost (runs first).
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
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			chain = (params: unknown) => mw(params, next);
		}
	}
	return chain;
}

// ---------------------------------------------------------------------------
// sequence() — combine multiple middlewares into one
// ---------------------------------------------------------------------------

/**
 * Combines an ordered array of middlewares into a single Middleware.
 * For each method, the first middleware in the array is outermost (runs first).
 * Middlewares that don't define a method are skipped for that method's chain.
 *
 * @param middlewares - Ordered array. mw[0] is outermost (closest to caller).
 * @returns A single Middleware that sequences all the input middlewares.
 */
export function sequence(middlewares: Middleware[]): Middleware {
	const combined: Middleware = {};

	for (const method of ALL_METHODS) {
		const mwFns = middlewares.map((mw) => mw[method] as ChainFn | undefined);
		// Only define the method if at least one middleware handles it
		if (mwFns.some((fn) => fn !== undefined)) {
			(combined as Record<string, ChainFn>)[method] = (
				params: unknown,
				next: ChainFn,
			) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				return buildChain(next, mwFns)(params);
			};
		}
	}

	return combined;
}

// ---------------------------------------------------------------------------
// compose() — wire a middleware to an AgentConnection
// ---------------------------------------------------------------------------

/**
 * Wires a middleware around an AgentConnection.
 *
 * @param connection - The AgentConnection (terminal for outbound, source for inbound)
 * @param middleware - A single Middleware. Use `sequence()` to combine multiple.
 * @param handler - App's terminal handlers for inbound callbacks. Partial — only
 *                  implement methods you handle (e.g. sessionUpdate + requestPermission).
 * @returns An AgentStack for the app to use for outbound calls.
 */
export function compose(
	connection: AgentConnection,
	middleware: Middleware,
	handler: Partial<AgentStack>,
): AgentStack {
	const stack = {} as Record<string, ChainFn>;

	// --- Outbound: app → middleware → connection ---
	for (const method of OUTBOUND_METHODS) {
		const terminal: ChainFn = ((p: never) =>
			connection[method](p)) as unknown as ChainFn;
		const mwFn = middleware[method] as ChainFn | undefined;
		stack[method] = mwFn
			? // eslint-disable-next-line @typescript-eslint/no-unsafe-return
				(params: unknown) => mwFn(params, terminal)
			: terminal;
	}

	// --- Inbound: connection → middleware → handler ---
	for (const method of INBOUND_METHODS) {
		const terminal: ChainFn = ((p: never) => {
			const fn = handler[method] as ChainFn | undefined;
			if (!fn) throw RequestError.methodNotFound(method);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return fn(p);
		}) as unknown as ChainFn;
		const mwFn = middleware[method] as ChainFn | undefined;
		stack[method] = mwFn
			? // eslint-disable-next-line @typescript-eslint/no-unsafe-return
				(params: unknown) => mwFn(params, terminal)
			: terminal;
	}

	// --- Lifecycle: dispose through middleware then connection ---
	{
		const terminal: ChainFn = (() =>
			connection.dispose()) as unknown as ChainFn;
		const mwFn = middleware.dispose as ChainFn | undefined;
		stack['dispose'] = mwFn
			? // eslint-disable-next-line @typescript-eslint/no-unsafe-return
				(params: unknown) => mwFn(params, terminal)
			: terminal;
	}

	// --- Wire inbound chains to the connection's handler ---
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
