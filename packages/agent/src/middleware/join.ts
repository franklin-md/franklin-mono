import type { CommandMiddleware, EventMiddleware } from './types.js';
import { COMMAND_METHODS, EVENT_METHODS } from './types.js';
import type { AgentCommands, AgentEvents } from '../stack/types.js';

// ---------------------------------------------------------------------------
// joinCommands — terminate the command side of a middleware
// ---------------------------------------------------------------------------

/**
 * Binds a command middleware to a terminal implementation (e.g. connection.commands).
 * Each middleware method's `next` is wired to the corresponding terminal method.
 *
 * ```
 * app → joinCommands(middleware, connection.commands) → agent
 * ```
 */
export function joinCommands(
	middleware: CommandMiddleware,
	terminal: AgentCommands,
): AgentCommands {
	const result: Record<string, unknown> = {};

	for (const method of COMMAND_METHODS) {
		const mwFn = middleware[method] as unknown as (
			params: unknown,
			next: (p: unknown) => unknown,
		) => unknown;
		const terminalFn = terminal[method] as unknown as (p: unknown) => unknown;
		result[method] = (params: never) => mwFn(params, terminalFn);
	}

	return result as unknown as AgentCommands;
}

// ---------------------------------------------------------------------------
// joinEvents — terminate the event side of a middleware
// ---------------------------------------------------------------------------

/**
 * Binds an event middleware to a terminal handler (e.g. the app's event callbacks).
 * Each middleware method's `next` is wired to the corresponding terminal method.
 *
 * ```
 * agent → joinEvents(middleware, appHandler) → app
 * ```
 */
export function joinEvents(
	middleware: EventMiddleware,
	terminal: AgentEvents,
): AgentEvents {
	const result: Record<string, unknown> = {};

	for (const method of EVENT_METHODS) {
		const mwFn = middleware[method] as unknown as (
			params: unknown,
			next: (p: unknown) => unknown,
		) => unknown;
		const terminalFn = terminal[method] as unknown as (p: unknown) => unknown;
		result[method] = (params: never) => mwFn(params, terminalFn);
	}

	return result as unknown as AgentEvents;
}
