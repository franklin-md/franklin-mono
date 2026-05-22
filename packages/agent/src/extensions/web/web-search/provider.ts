import type { Fetch } from '@franklin/lib';
import type { WebSearchExtensionOptions, WebSearchResult } from './types.js';

export const EXA_WEB_SEARCH_PROVIDER_ID = 'exa';
export const DUCK_DUCK_GO_WEB_SEARCH_PROVIDER_ID = 'duckduckgo';

export type WebSearchProviderRequest = {
	readonly query: string;
	readonly fetch: Fetch;
	readonly options: WebSearchExtensionOptions;
};

export type WebSearchProvider = {
	readonly id?: string;
	readonly name: string;
	search(
		request: WebSearchProviderRequest,
	): Promise<readonly WebSearchResult[]>;
};
