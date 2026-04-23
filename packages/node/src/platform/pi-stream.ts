import type { StreamFn } from '@mariozechner/pi-agent-core';
import { streamSimple, type SimpleStreamOptions } from '@mariozechner/pi-ai';

type PiStreamOptions = {
	fetch: typeof globalThis.fetch;
};

export function createPiStreamFn(options: PiStreamOptions): StreamFn {
	const { fetch } = options;

	return (model, context, streamOptions) => {
		const nextOptions: SimpleStreamOptions = streamOptions
			? { ...streamOptions, fetch }
			: { fetch };
		return streamSimple(model, context, nextOptions);
	};
}
