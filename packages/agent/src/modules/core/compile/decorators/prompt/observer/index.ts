import type { StreamEvent } from '@franklin/mini-acp';
import type { CoreRegistry } from '../../../registrations/index.js';

export function createPromptObserver(
	registrations: CoreRegistry,
): (stream: AsyncIterable<StreamEvent>) => AsyncGenerator<StreamEvent> {
	const observers = {
		turnStart: registrations.handlersFor('turnStart'),
		chunk: registrations.handlersFor('chunk'),
		update: registrations.handlersFor('update'),
		turnEnd: registrations.handlersFor('turnEnd'),
	};

	return async function* observePromptStream(stream) {
		for await (const event of stream) {
			const fns = observers[event.type];
			for (const fn of fns) {
				(fn as (e: typeof event) => void)(event);
			}
			yield event;
		}
	};
}
