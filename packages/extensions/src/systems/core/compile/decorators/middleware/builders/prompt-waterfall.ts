import type { MiniACPClient, StreamEvent } from '@franklin/mini-acp';
import type {
	PromptHandler,
	StreamObserverEvent,
	StreamObserverHandler,
} from '../../../../api/handlers.js';
import type { MethodMiddleware } from '@franklin/lib/middleware';
import { createPrompt } from '../../../../api/prompt.js';

export type StreamObservers = {
	[K in StreamObserverEvent]: StreamObserverHandler<K>[];
};

export function hasAnyStreamObserver(observers: StreamObservers): boolean {
	return (
		observers.turnStart.length > 0 ||
		observers.chunk.length > 0 ||
		observers.update.length > 0 ||
		observers.turnEnd.length > 0
	);
}

async function* iteratePromptWithObservers(
	stream: ReturnType<MiniACPClient['prompt']>,
	observers: StreamObservers,
): AsyncGenerator<StreamEvent> {
	for await (const result of stream) {
		const fns = observers[result.type];
		for (const fn of fns) (fn as (e: typeof result) => void)(result);
		yield result;
	}
}

/**
 * Build prompt middleware (returns AsyncIterable, not Promise).
 * Prompt handlers contribute content through Prompt, then the final
 * request is passed to the downstream client.
 *
 * When any stream observer is registered, manually iterates the stream
 * and dispatches events to matching observers. Without observers, uses
 * yield* (fast path).
 */
export function buildPromptWaterfall(
	handlers: PromptHandler[],
	observers: StreamObservers,
): MethodMiddleware<MiniACPClient['prompt']> {
	const observed = hasAnyStreamObserver(observers);
	return async function* (params, next) {
		const prompt = createPrompt(params);
		for (const handler of handlers) {
			await handler(prompt);
		}

		const downstream = next(prompt.asPrompt());
		if (observed) {
			return yield* iteratePromptWithObservers(downstream, observers);
		}
		return yield* downstream;
	};
}
