import type { MiniACPClient, StreamEvent } from '@franklin/mini-acp';
import type { ProtocolDecorator } from '../types.js';
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

async function* observePromptStream(
	stream: ReturnType<MiniACPClient['prompt']>,
	observers: AgentStreamObservers,
): AsyncGenerator<StreamEvent> {
	for await (const event of stream) {
		notifyObservers(observers, event);
		yield event;
	}
}

export function createAgentObserverDecorator(
	observers: AgentStreamObservers,
): ProtocolDecorator {
	return {
		name: 'agent-observer',
		async server(s) {
			return s;
		},
		async client(c): Promise<MiniACPClient> {
			return {
				...c,
				prompt(message) {
					return observePromptStream(c.prompt(message), observers);
				},
			} as MiniACPClient;
		},
	};
}
