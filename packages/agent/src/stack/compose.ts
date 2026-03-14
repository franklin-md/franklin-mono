import { RequestError } from '@agentclientprotocol/sdk';

import type { AgentConnection } from '../connection.js';

import type { AgentControl, AgentEvents, AgentStack } from './types.js';
import type { ChainFn, Middleware } from './middleware.js';
import { ALL_METHODS, COMMAND_METHODS, EVENT_METHODS } from './middleware.js';

// ---------------------------------------------------------------------------
// compose() — pure middleware composition
// ---------------------------------------------------------------------------

/**
 * Pure composition: wraps a middleware around an inner partial stack.
 * For each method the middleware defines, it wraps around inner's corresponding
 * method (which becomes `next`). Methods only in inner pass through unchanged.
 *
 * @param middleware - A single Middleware. Use `sequence()` to combine multiple.
 * @param inner - The terminal partial stack (e.g. connection commands + handler events).
 * @returns A new Partial<AgentStack> with wrapped methods.
 */
export function compose(
	middleware: Middleware,
	inner: Partial<AgentStack>,
): Partial<AgentStack> {
	const result: Record<string, ChainFn> = {};

	for (const method of ALL_METHODS) {
		const mwFn = middleware[method] as ChainFn | undefined;
		const innerFn = (inner as Record<string, ChainFn | undefined>)[method];

		if (mwFn) {
			const next: ChainFn = innerFn
				? innerFn
				: ((() => {
						throw RequestError.methodNotFound(method);
					}) as unknown as ChainFn);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			result[method] = (params: unknown) => mwFn(params, next);
		} else if (innerFn) {
			result[method] = innerFn;
		}
	}

	return result as Partial<AgentStack>;
}

// ---------------------------------------------------------------------------
// connect() — wire a middleware to an AgentConnection
// ---------------------------------------------------------------------------

/**
 * Builds a base stack from a connection + handler, composes middleware on top,
 * and wires the connection's inbound handler. This is the single side-effectful
 * boundary — compose() above is pure.
 *
 * @param connection - The AgentConnection (terminal for commands, source for events).
 * @param middleware - A single Middleware. Use `sequence()` to combine multiple.
 * @param handler - App's terminal handlers for inbound events. Partial — only
 *                  implement methods you handle (e.g. sessionUpdate + requestPermission).
 * @returns An AgentControl for the app to use.
 */
export function connect(
	connection: AgentConnection,
	middleware: Middleware,
	handler: Partial<AgentEvents>,
): AgentControl {
	// --- Build the base Partial<AgentStack> from connection + handler ---
	const base: Record<string, ChainFn> = {};

	for (const method of COMMAND_METHODS) {
		base[method] = ((p: never) => connection[method](p)) as unknown as ChainFn;
	}

	for (const method of EVENT_METHODS) {
		const fn = handler[method] as ChainFn | undefined;
		base[method] = fn
			? fn
			: ((() => {
					throw RequestError.methodNotFound(method);
				}) as unknown as ChainFn);
	}

	base['dispose'] = (() => connection.dispose()) as unknown as ChainFn;

	// --- Pure compose ---
	const composed = compose(middleware, base as Partial<AgentStack>);

	// --- Wire inbound events to the connection's handler (side effect) ---
	connection.handler = Object.fromEntries(
		EVENT_METHODS.map((method) => [
			method,
			(composed as Record<string, ChainFn>)[method],
		]).filter(([, fn]) => fn !== undefined),
	) as Partial<AgentEvents>;

	return composed as unknown as AgentControl;
}
