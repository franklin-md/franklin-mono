import { createObserver } from '@franklin/lib';
import type { AgentClient, CoreEvent, CoreRuntime } from './types.js';

async function* notifyAfter<T>(
	stream: AsyncIterable<T>,
	notify: () => void,
): AsyncIterable<T> {
	try {
		yield* stream;
	} finally {
		notify();
	}
}

// `notify` fires at turn end (after prompt completes), not per-chunk —
// persisting incomplete responses mid-stream isn't useful, they can't be resumed.
export function createClientRuntime(
	client: AgentClient,
): Pick<
	CoreRuntime,
	'prompt' | 'cancel' | 'setLLMConfig' | 'dispose' | 'coreEvents' | 'subscribe'
> {
	const observer = createObserver<[CoreEvent]>();
	const coreEvents = {
		subscribe: (listener: (event: CoreEvent) => void) =>
			observer.subscribe(listener),
	};

	return {
		async setLLMConfig(config) {
			await client.setContext({ config });
			observer.notify({ type: 'llm-config-changed' });
		},
		prompt(message) {
			return notifyAfter(client.prompt(message), () =>
				observer.notify({ type: 'turn-settled' }),
			);
		},
		cancel: client.cancel.bind(client),
		async dispose() {
			await client.dispose();
		},
		coreEvents,
		subscribe: (listener) => coreEvents.subscribe(() => listener()),
	};
}
