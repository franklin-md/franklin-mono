import type { AgentCommands, AgentEvents } from '../types.js';

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

// next calls into the connection — complete: all command methods required
export type CommandMiddleware = {
	[K in keyof AgentCommands]: Cont<AgentCommands[K]>;
};

// next calls into the client — complete: all event methods required
export type EventMiddleware = {
	[K in keyof AgentEvents]: Cont<AgentEvents[K]>;
};

/**
 * A middleware intercepts methods on the agent command/event surface. Each overridden method
 * receives the original params plus a `next` function that calls the next
 * layer in the chain. Call `next(params)` to forward, or return directly to
 * short-circuit.
 *
 * Unlike CommandMiddleware and EventMiddleware (which require all methods),
 * Middleware is partial — implement only the methods you want to intercept.
 */
export type Middleware = CommandMiddleware &
	EventMiddleware & {
		/** Clean up resources owned by this middleware. */
		dispose?: () => Promise<void>;
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

export const ALL_METHODS = [...COMMAND_METHODS, ...EVENT_METHODS] as const;
