import type { MethodMiddleware } from './types.js';

type WaterfallHandler<T> = (
	params: T,
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
) => T | void | Promise<T | void>;

/**
 * Runs handlers as a waterfall: each handler sees the params produced by the
 * previous one, then `next` is called with the final params. A handler
 * returning void leaves params unchanged.
 */
export function buildWaterfall<Fn extends (p: any) => Promise<any>>(
	handlers: WaterfallHandler<Parameters<Fn>[0]>[],
): MethodMiddleware<Fn> {
	return (async (params, next) => {
		let p = params;
		for (const handler of handlers) {
			const result = await handler(p);
			if (result !== undefined) p = result;
		}
		return next(p);
	}) as MethodMiddleware<Fn>;
}
