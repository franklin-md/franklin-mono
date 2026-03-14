import type { AgentCommands, AgentEvents, AgentLifecycle } from './types.js';

// ---------------------------------------------------------------------------
// Cont — continuation-passing style wrapper for a single method
// ---------------------------------------------------------------------------

export type Cont<Fn extends (...args: any[]) => any> = (
	params: Parameters<Fn>[0],
	next: (params: Parameters<Fn>[0]) => ReturnType<Fn>,
) => ReturnType<Fn>;

// ---------------------------------------------------------------------------
// Directional middleware types
// ---------------------------------------------------------------------------

export type CommandMiddleware = {
	[K in keyof AgentCommands]?: Cont<AgentCommands[K]>;
};

export type EventMiddleware = {
	[K in keyof AgentEvents]?: Cont<AgentEvents[K]>;
};

/**
 * A middleware intercepts methods on the agent stack. Each overridden method
 * receives the original params plus a `next` function that calls the next
 * layer in the chain. Call `next(params)` to forward, or return directly to
 * short-circuit.
 */
export type Middleware = CommandMiddleware &
	EventMiddleware & {
		dispose?: Cont<AgentLifecycle['dispose']>;
	};

// ---------------------------------------------------------------------------
// Method name lists
// ---------------------------------------------------------------------------

export const COMMAND_METHODS = [
	'initialize',
	'newSession',
	'loadSession',
	'listSessions',
	'prompt',
	'cancel',
	'setSessionMode',
	'setSessionConfigOption',
	'authenticate',
] as const satisfies readonly (keyof AgentCommands)[];

export const EVENT_METHODS = [
	'sessionUpdate',
	'requestPermission',
	'readTextFile',
	'writeTextFile',
	'createTerminal',
	'terminalOutput',
	'releaseTerminal',
	'waitForTerminalExit',
	'killTerminal',
] as const satisfies readonly (keyof AgentEvents)[];

export const ALL_METHODS = [
	...COMMAND_METHODS,
	...EVENT_METHODS,
	'dispose',
] as const;

// ---------------------------------------------------------------------------
// buildChain — internal chain builder
// ---------------------------------------------------------------------------

// Internal function type — intentionally permissive. Type safety comes from
// the public types, not from the chain-building internals.
export type ChainFn = (...args: any[]) => any;

/**
 * Builds a chain of middleware functions around a terminal function.
 * Each middleware receives (params, next) where next calls the next layer.
 * Middlewares are wrapped from last to first: the first middleware in the
 * array is outermost (runs first).
 */
export function buildChain(
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
