import type { StreamFn } from '@earendil-works/pi-agent-core';
import { streamSimple, type SimpleStreamOptions } from '@earendil-works/pi-ai';
import { streamSimpleOpenAICompletions } from '@earendil-works/pi-ai/openai-completions';

type PiStreamOptions = {
	fetch: typeof globalThis.fetch;
};

export function createPiStreamFn(options: PiStreamOptions): StreamFn {
	const { fetch } = options;

	return (model, context, streamOptions) => {
		const nextOptions: SimpleStreamOptions = streamOptions
			? { ...streamOptions, fetch }
			: { fetch };

		if (model.api !== 'openai-completions') {
			return streamSimple(model, context, nextOptions);
		}

		// The OpenAI-compatible pi-ai provider currently constructs its SDK client
		// from globalThis.fetch synchronously before it starts the request.
		const previousFetch = globalThis.fetch;
		globalThis.fetch = fetch;
		try {
			return streamSimpleOpenAICompletions(
				model as Parameters<typeof streamSimpleOpenAICompletions>[0],
				context,
				nextOptions,
			);
		} finally {
			globalThis.fetch = previousFetch;
		}
	};
}
