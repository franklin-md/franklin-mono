import type { MiniACPClient, Chunk, Update, TurnEnd } from '@franklin/mini-acp';
import type {
	CoreEventHandler,
	StreamObserverEvent,
	StreamObserverHandler,
} from '../../../api/core/events.js';
import type { MethodMiddleware } from '../../../api/core/middleware/types.js';

async function notifyObservers(
	observers: ReadonlyMap<
		StreamObserverEvent,
		StreamObserverHandler<StreamObserverEvent>[]
	>,
	event: Chunk | Update | TurnEnd,
): Promise<void> {
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
): AsyncGenerator<Chunk | Update, TurnEnd, void> {
	const iterator = stream[Symbol.asyncIterator]();
	for (;;) {
		const result = await iterator.next();
		const event = result.value;
		// Notify observers — guard against undefined event (generator
		// that returns void instead of TurnEnd) and empty observer map
		if (observers && observers.size > 0 && event) {
			await notifyObservers(observers, event);
		}

		// Yield case
		if (!result.done) {
			yield event as Chunk | Update;
		}
		// Return case
		else {
			return event as TurnEnd;
		}
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
