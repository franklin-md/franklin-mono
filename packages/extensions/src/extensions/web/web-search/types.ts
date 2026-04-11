export interface WebSearchExtensionOptions {
	timeoutMs: number;
	maxRedirects: number;
	maxResults: number;
	maxRetries: number;
	retryDelayMsRange: [number, number];
}

export type WebSearchResult = {
	title: string;
	url: string;
	snippet: string;
};

export const DEFAULT_WEB_SEARCH_OPTIONS: WebSearchExtensionOptions = {
	timeoutMs: 10_000,
	maxRedirects: 3,
	maxResults: 10,
	maxRetries: 3,
	retryDelayMsRange: [500, 1000],
};

export function resolveWebSearchOptions(
	options: Partial<WebSearchExtensionOptions> = {},
): WebSearchExtensionOptions {
	return {
		timeoutMs: options.timeoutMs ?? DEFAULT_WEB_SEARCH_OPTIONS.timeoutMs,
		maxRedirects:
			options.maxRedirects ?? DEFAULT_WEB_SEARCH_OPTIONS.maxRedirects,
		maxResults: options.maxResults ?? DEFAULT_WEB_SEARCH_OPTIONS.maxResults,
		maxRetries: options.maxRetries ?? DEFAULT_WEB_SEARCH_OPTIONS.maxRetries,
		retryDelayMsRange:
			options.retryDelayMsRange ?? DEFAULT_WEB_SEARCH_OPTIONS.retryDelayMsRange,
	};
}
