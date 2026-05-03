import { createObserver } from '@franklin/lib';
import type { CoreRuntime, AgentClient } from './types.js';

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
	'prompt' | 'cancel' | 'setLLMConfig' | 'dispose' | 'subscribe'
> {
	const observer = createObserver();

	return {
		async setLLMConfig(config) {
			await client.setContext({ config });
			observer.notify();
		},
		prompt(message) {
			return notifyAfter(client.prompt(message), () => observer.notify());
		},
		cancel: client.cancel.bind(client),
		async dispose() {
			await client.dispose();
		},
		subscribe: (listener) => observer.subscribe(listener),
	};
}
