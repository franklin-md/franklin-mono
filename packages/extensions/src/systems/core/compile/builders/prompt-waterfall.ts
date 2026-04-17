import type { MiniACPClient, StreamEvent } from '@franklin/mini-acp';
import type {
	PromptHandler,
	StreamObserverEvent,
	StreamObserverHandler,
} from '../../api/events.js';
import type { MethodMiddleware } from '../../api/middleware/types.js';
import { createPromptContext } from '../../api/prompt-context.js';

function notifyObservers(
	observers: ReadonlyMap<
		StreamObserverEvent,
		StreamObserverHandler<StreamObserverEvent>[]
	>,
	event: StreamEvent,
): void {
	const fns = observers.get(event.type);
	if (!fns) return;
	for (const fn of fns) fn(event);
}

async function* iteratePromptWithObservers(
	stream: ReturnType<MiniACPClient['prompt']>,
	observers?: ReadonlyMap<
		StreamObserverEvent,
		StreamObserverHandler<StreamObserverEvent>[]
	>,
): AsyncGenerator<StreamEvent> {
	for await (const result of stream) {
		// Notify observers — guard against undefined event (generator
		// that returns void instead of TurnEnd) and empty observer map
		if (observers && observers.size > 0) {
			notifyObservers(observers, result);
		}

		yield result;
	}
}

/**
 * Build prompt middleware (returns AsyncIterable, not Promise).
 * Prompt handlers contribute content through PromptContext, then the final
 * request is passed to the downstream client.
 *
 * When observers are provided, manually iterates the stream and dispatches
 * events to matching observers. Without observers, uses yield* (fast path).
 */
export function buildPromptWaterfall(
	handlers: PromptHandler[],
	observers?: ReadonlyMap<
		StreamObserverEvent,
		StreamObserverHandler<StreamObserverEvent>[]
	>,
): MethodMiddleware<MiniACPClient['prompt']> {
	return async function* (params, next) {
		const ctx = createPromptContext(params);
		for (const handler of handlers) {
			await handler(ctx);
		}

		return yield* iteratePromptWithObservers(next(ctx.asPrompt()), observers);
	};
}
