import type { MiniACPClient, StreamEvent } from '@franklin/mini-acp';
import type { MethodMiddleware } from '@franklin/lib/middleware';
import type { AgentStreamObservers } from './types.js';

function notifyObservers(
	observers: AgentStreamObservers,
	event: StreamEvent,
): void {
	const fns = observers[event.type];
	for (const fn of fns) {
		(fn as (e: typeof event) => void)(event);
	}
}

export async function* observePromptStream(
	stream: ReturnType<MiniACPClient['prompt']>,
	observers: AgentStreamObservers,
): AsyncGenerator<StreamEvent> {
	for await (const event of stream) {
		notifyObservers(observers, event);
		yield event;
	}
}

export function buildAgentObserverPromptMiddleware(
	observers: AgentStreamObservers,
): MethodMiddleware<MiniACPClient['prompt']> {
	return async function* (message, next) {
		yield* observePromptStream(next(message), observers);
	};
}
