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
type CoreEventStream = Pick<CoreRuntime, 'coreEvents'> & {
	notify(event: CoreEvent): void;
};

export function createClientRuntime(input: {
	readonly client: AgentClient;
	readonly events: CoreEventStream;
}): Pick<
	CoreRuntime,
	'prompt' | 'cancel' | 'setLLMConfig' | 'dispose' | 'coreEvents'
> {
	const { client, events } = input;

	return {
		async setLLMConfig(config) {
			await client.setContext({ config });
			events.notify({ type: 'llm-config-changed' });
		},
		prompt(message) {
			return notifyAfter(client.prompt(message), () =>
				events.notify({ type: 'turn-settled' }),
			);
		},
		cancel: client.cancel.bind(client),
		async dispose() {
			await client.dispose();
		},
		coreEvents: events.coreEvents,
	};
}
