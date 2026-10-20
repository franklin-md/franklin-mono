import type { StreamFn } from '@earendil-works/pi-agent-core';
import type { SimpleStreamOptions } from '@earendil-works/pi-ai';
import { streamSimple } from '@earendil-works/pi-ai';
import { streamSimpleOpenAICompletions } from '@earendil-works/pi-ai/openai-completions';

type PiStreamOptions = {
	fetch: typeof globalThis.fetch;
};

export function createPiStreamFn(options: PiStreamOptions): StreamFn {
	const { fetch } = options;

	return (model, context, streamOptions) => {
		const baseOptions: SimpleStreamOptions =
			streamOptions === undefined ? { fetch } : { ...streamOptions, fetch };
		// OpenCode Go uses this provider-specific header to keep requests from the
		// same agent session routable: https://opencode.ai/docs/go/#where-can-i-use-it
		const resolvedOptions: SimpleStreamOptions =
			model.provider === 'opencode-go' && baseOptions.sessionId
				? {
						...baseOptions,
						headers: {
							...baseOptions.headers,
							'x-opencode-session': baseOptions.sessionId,
						},
					}
				: baseOptions;

		if (model.api !== 'openai-completions') {
			return streamSimple(model, context, resolvedOptions);
		}

		return streamSimpleOpenAICompletions(
			model as Parameters<typeof streamSimpleOpenAICompletions>[0],
			context,
			resolvedOptions,
		);
	};
}
