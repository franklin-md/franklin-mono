import type { MiniACPClient, StreamEvent } from '@franklin/mini-acp';
import type {
	CoreEventHandler,
	StreamObserverEvent,
	StreamObserverHandler,
} from '../../api/events.js';
import type { MethodMiddleware } from '../../api/middleware/types.js';

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
 * Build a MethodMiddleware for prompt (returns AsyncIterable, not Promise).
 * Uses an async generator so the return type stays AsyncIterable.
 *
 * When observers are provided, manually iterates the stream and dispatches
 * events to matching observers. Without observers, uses yield* (fast path).
 */
export function buildPromptWaterfall(
	handlers: CoreEventHandler<'prompt'>[],
	observers?: ReadonlyMap<
		StreamObserverEvent,
		StreamObserverHandler<StreamObserverEvent>[]
	>,
): MethodMiddleware<MiniACPClient['prompt']> {
	return async function* (params, next) {
		// Waterfall the params of prompt
		let p = params;
		for (const handler of handlers) {
			const result = await handler(p);
			if (result !== undefined) p = result;
		}
		// Now wrap the iterator you get back when you call prompt
		// And notify the observers if they are provided
		return yield* iteratePromptWithObservers(next(p), observers);
	};
}
