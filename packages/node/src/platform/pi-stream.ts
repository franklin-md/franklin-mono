import type { StreamFn } from '@earendil-works/pi-agent-core';
import { streamSimple, type SimpleStreamOptions } from '@earendil-works/pi-ai';

type PiStreamOptions = {
	fetch: typeof globalThis.fetch;
};

export function createPiStreamFn(options: PiStreamOptions): StreamFn {
	const { fetch } = options;

	return (model, context, streamOptions) => {
		const nextOptions: SimpleStreamOptions = streamOptions
			? { transport: 'sse', ...streamOptions, fetch }
			: { transport: 'sse', fetch };
		return streamSimple(model, context, nextOptions);
	};
}
