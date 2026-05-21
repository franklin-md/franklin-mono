import type { MiniACPClient } from '@franklin/mini-acp';
import type { PromptHandler } from '../../../../api/handlers.js';
import type { MethodMiddleware } from '@franklin/lib/middleware';
import { createPrompt } from '../../../../api/prompt.js';

/**
 * Build prompt middleware (returns AsyncIterable, not Promise).
 * Prompt handlers contribute content through Prompt, then the final
 * request is passed to the downstream client.
 */
export function buildPromptWaterfall(
	handlers: PromptHandler[],
): MethodMiddleware<MiniACPClient['prompt']> {
	return async function* (params, next) {
		const prompt = createPrompt(params);
		for (const handler of handlers) {
			await handler(prompt);
		}

		yield* next(prompt.asPrompt());
	};
}
