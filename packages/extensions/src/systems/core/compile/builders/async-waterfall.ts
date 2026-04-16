import type { MiniACPClient } from '@franklin/mini-acp';
import type { CancelHandler } from '../../api/events.js';
import type { MethodMiddleware } from '../../api/middleware/types.js';

/**
 * Build cancel middleware.
 * Runs handlers as a waterfall, then calls next with the final params.
 */
export function buildAsyncWaterfall(
	handlers: CancelHandler[],
): MethodMiddleware<MiniACPClient['cancel']> {
	return (async (params: unknown, next: (p: unknown) => unknown) => {
		let p = params as Parameters<CancelHandler>[0];
		for (const handler of handlers) {
			const result = await handler(p);
			if (result !== undefined) p = result;
		}
		return next(p);
	}) as MethodMiddleware<MiniACPClient['cancel']>;
}
