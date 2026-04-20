import { createObserver } from '@franklin/lib';
import type { CoreRuntime, AgentClient } from './types.js';

export type ClientRuntime = Pick<
	CoreRuntime,
	'prompt' | 'cancel' | 'setLLMConfig' | 'dispose' | 'subscribe'
>;

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

/**
 * The client-bound slice of `CoreRuntime`: prompt/cancel/setLLMConfig/dispose
 * plus the turn-end notification surface wired to `subscribe`.
 *
 * Notify fires after `prompt` completes (turn end), not per-chunk.
 * Originally wired to tracker.onChange which fired per-chunk on every
 * append. Moved to turn-end because persisting incomplete responses
 * mid-stream isn't useful — they can't be resumed.
 */
export function createClientRuntime(client: AgentClient): ClientRuntime {
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
