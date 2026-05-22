export interface WebSearchExtensionOptions {
	readonly timeoutMs: number;
	readonly maxRedirects: number;
	readonly maxResults: number;
	readonly maxRetries: number;
	readonly retryDelayMsRange: readonly [number, number];
}

export type WebSearchResult = {
	title: string;
	url: string;
	snippet: string;
};

export type WebSearchProviderMetadata = {
	readonly id: string;
	readonly name: string;
};

export type WebSearchProviderFailure = {
	readonly provider: WebSearchProviderMetadata;
	readonly message: string;
};

export type WebSearchSuccessOutput = {
	readonly kind: 'success';
	readonly query: string;
	readonly provider: WebSearchProviderMetadata;
	readonly results: readonly WebSearchResult[];
};

export type WebSearchErrorOutput = {
	readonly kind: 'error';
	readonly query: string;
	readonly message: string;
	readonly failures: readonly WebSearchProviderFailure[];
};

export type WebSearchOutput = WebSearchSuccessOutput | WebSearchErrorOutput;

const DEFAULT_WEB_SEARCH_OPTIONS = {
	timeoutMs: 10_000,
	maxRedirects: 3,
	maxResults: 10,
	maxRetries: 3,
	retryDelayMsRange: [500, 1000],
} as const satisfies WebSearchExtensionOptions;

export function resolveWebSearchOptions(
	options: Partial<WebSearchExtensionOptions> = {},
): WebSearchExtensionOptions {
	const retryDelayMsRange =
		options.retryDelayMsRange ?? DEFAULT_WEB_SEARCH_OPTIONS.retryDelayMsRange;

	return {
		timeoutMs: options.timeoutMs ?? DEFAULT_WEB_SEARCH_OPTIONS.timeoutMs,
		maxRedirects:
			options.maxRedirects ?? DEFAULT_WEB_SEARCH_OPTIONS.maxRedirects,
		maxResults: options.maxResults ?? DEFAULT_WEB_SEARCH_OPTIONS.maxResults,
		maxRetries: options.maxRetries ?? DEFAULT_WEB_SEARCH_OPTIONS.maxRetries,
		retryDelayMsRange: [retryDelayMsRange[0], retryDelayMsRange[1]],
	};
}
