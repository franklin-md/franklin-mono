import type { Middleware } from '../../../middleware/types.js';
import { COMMAND_METHODS, EVENT_METHODS } from '../../../middleware/types.js';
import { emptyMiddleware } from '../../../middleware/empty.js';

/**
 * Creates a debug middleware that logs all protocol messages in both
 * directions: commands (app → agent) and events (agent → app).
 *
 * Each intercepted method logs the method name and params, then
 * forwards unchanged via `next()`. Responses are logged on return.
 *
 * Usage:
 * ```ts
 * import { createDebugMiddleware } from './extensions/examples/debug/index.js';
 * const stack = sequence(createDebugMiddleware(), myExtensionMiddleware);
 * ```
 */
export function createDebugMiddleware(
	options: DebugMiddlewareOptions = {},
): Middleware {
	const { label = 'debug', log = defaultLog } = options;

	const mw: Record<
		string,
		(params: never, next: (p: never) => unknown) => unknown
	> = {};

	for (const method of COMMAND_METHODS) {
		mw[method] = async (
			params: never,
			next: (p: never) => unknown,
		): Promise<unknown> => {
			log(label, '→', method, params);
			const result = await next(params);
			log(label, '←', `${method}:response`, result);
			return result;
		};
	}

	for (const method of EVENT_METHODS) {
		mw[method] = async (
			params: never,
			next: (p: never) => unknown,
		): Promise<unknown> => {
			log(label, '←', method, params);
			const result = await next(params);
			log(label, '→', `${method}:response`, result);
			return result;
		};
	}

	return {
		...(mw as unknown as Middleware),
		async dispose() {
			log(label, '•', 'dispose', undefined);
		},
	};
}

export interface DebugMiddlewareOptions {
	/** Prefix for log lines. Defaults to `"debug"`. */
	label?: string;
	/**
	 * Custom log function. Receives direction arrow, method name, and params.
	 * Defaults to `console.log` with JSON-serialized params.
	 */
	log?: (
		label: string,
		direction: string,
		method: string,
		params: unknown,
	) => void;
}

function defaultLog(
	label: string,
	direction: string,
	method: string,
	params: unknown,
): void {
	console.log(`[${label}] ${direction} ${method}`, params);
}

// Re-export emptyMiddleware for convenience when composing
export { emptyMiddleware };
