import type {
	ChainFn,
	CommandMiddleware,
	EventMiddleware,
	Middleware,
} from './middleware.js';
import {
	ALL_METHODS,
	COMMAND_METHODS,
	EVENT_METHODS,
	buildChain,
} from './middleware.js';

// ---------------------------------------------------------------------------
// sequenceCommands — combine command middlewares
// ---------------------------------------------------------------------------

/**
 * Combines an ordered array of command middlewares into a single one.
 * The first middleware in the array is outermost (runs first).
 */
export function sequenceCommands(
	middlewares: Partial<CommandMiddleware>[],
): Partial<CommandMiddleware> {
	const combined: Partial<CommandMiddleware> = {};

	for (const method of COMMAND_METHODS) {
		const mwFns = middlewares.map((mw) => mw[method] as ChainFn | undefined);
		if (mwFns.some((fn) => fn !== undefined)) {
			(combined as Record<string, ChainFn>)[method] = (
				params: unknown,
				next: ChainFn,
			) => {
				return buildChain(next, mwFns)(params);
			};
		}
	}

	return combined;
}

// ---------------------------------------------------------------------------
// sequenceEvents — combine event middlewares
// ---------------------------------------------------------------------------

/**
 * Combines an ordered array of event middlewares into a single one.
 * The first middleware in the array is outermost (runs first).
 */
export function sequenceEvents(
	middlewares: Partial<EventMiddleware>[],
): Partial<EventMiddleware> {
	const combined: Partial<EventMiddleware> = {};

	for (const method of EVENT_METHODS) {
		const mwFns = middlewares.map((mw) => mw[method] as ChainFn | undefined);
		if (mwFns.some((fn) => fn !== undefined)) {
			(combined as Record<string, ChainFn>)[method] = (
				params: unknown,
				next: ChainFn,
			) => {
				return buildChain(next, mwFns)(params);
			};
		}
	}

	return combined;
}

// ---------------------------------------------------------------------------
// sequence — combine full middlewares (commands + events + dispose)
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
				return buildChain(next, mwFns)(params);
			};
		}
	}

	return combined;
}
