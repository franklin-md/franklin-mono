import type { Fetch } from '@franklin/lib';
import type { WebSearchExtensionOptions, WebSearchResult } from './types.js';

export type WebSearchProviderRequest = {
	readonly query: string;
	readonly fetch: Fetch;
	readonly options: WebSearchExtensionOptions;
};

export type WebSearchProvider = {
	readonly name: string;
	search(
		request: WebSearchProviderRequest,
	): Promise<readonly WebSearchResult[]>;
};
