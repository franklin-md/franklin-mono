import type { MiniACPClient } from '@franklin/mini-acp';
import type { CoreEvent, CoreEventHandler } from '../../api/events.js';
import type { MethodMiddleware } from '@franklin/lib/middleware';

/**
 * Build a MethodMiddleware for Promise-returning methods (initialize, setContext, cancel).
 * Runs handlers as a waterfall, then calls next with the final params.
 */
export function buildAsyncWaterfall<K extends CoreEvent>(
	handlers: CoreEventHandler<K>[],
): MethodMiddleware<MiniACPClient[K]> {
	// Cast needed: TS can't prove Promise<ReturnType> collapses for generic K,
	// but at runtime async auto-unwraps Promises.
	return (async (params: unknown, next: (p: unknown) => unknown) => {
		let p = params as Parameters<MiniACPClient[K]>[0];
		for (const handler of handlers) {
			const result = await handler(p);
			if (result !== undefined) p = result;
		}
		return next(p);
	}) as MethodMiddleware<MiniACPClient[K]>;
}
