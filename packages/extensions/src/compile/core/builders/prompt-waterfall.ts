import type { MiniACPClient } from '@franklin/mini-acp';
import type { CoreEventHandler } from '../../../api/core/events.js';
import type { MethodMiddleware } from '../../../api/core/middleware/types.js';

/**
 * Build a MethodMiddleware for prompt (returns AsyncIterable, not Promise).
 * Uses an async generator so the return type stays AsyncIterable.
 */
export function buildPromptWaterfall(
	handlers: CoreEventHandler<'prompt'>[],
): MethodMiddleware<MiniACPClient['prompt']> {
	return async function* (params, next) {
		let p = params;
		for (const handler of handlers) {
			const result = await handler(p);
			if (result !== undefined) p = result;
		}
		yield* next(p);
	};
}
