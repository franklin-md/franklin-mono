import type { Middleware } from './types.js';
import { COMMAND_METHODS, EVENT_METHODS } from './types.js';

// ---------------------------------------------------------------------------
// emptyMiddleware — identity element for sequence()
// ---------------------------------------------------------------------------

/**
 * A middleware that forwards every method unchanged. Use as a base to
 * override only the methods you care about:
 *
 * ```ts
 * const myMiddleware: Middleware = {
 *   ...emptyMiddleware,
 *   prompt: async (params, next) => {
 *     console.log('before prompt');
 *     return next(params);
 *   },
 * };
 * ```
 */
function buildEmptyMiddleware(): Middleware {
	const mw: Record<
		string,
		(params: never, next: (p: never) => unknown) => unknown
	> = {};

	for (const method of COMMAND_METHODS) {
		mw[method] = (params: never, next: (p: never) => unknown) => next(params);
	}
	for (const method of EVENT_METHODS) {
		mw[method] = (params: never, next: (p: never) => unknown) => next(params);
	}

	return mw as unknown as Middleware;
}

export const emptyMiddleware: Middleware = buildEmptyMiddleware();
