import type { StreamFn } from '@earendil-works/pi-agent-core';
import type { SimpleStreamOptions } from '@earendil-works/pi-ai';
import { streamSimple } from '@earendil-works/pi-ai/compat';

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

		return streamSimple(model, context, resolvedOptions);
	};
}
