export interface WebFetchExtensionOptions {
	readonly timeoutMs: number;
	readonly maxRedirects: number;
	readonly maxOutputChars: number;
}

export type WebFetchProcessedResult = {
	kind: 'pdf' | 'html' | 'text' | 'http_error' | 'error';
	content: string;
	isError: boolean;
	truncated: boolean;
};

const DEFAULT_WEB_FETCH_OPTIONS = {
	timeoutMs: 8000,
	maxRedirects: 5,
	maxOutputChars: 20_000,
} as const satisfies WebFetchExtensionOptions;

export function resolveWebFetchOptions(
	options: Partial<WebFetchExtensionOptions> = {},
): WebFetchExtensionOptions {
	return {
		timeoutMs: options.timeoutMs ?? DEFAULT_WEB_FETCH_OPTIONS.timeoutMs,
		maxRedirects:
			options.maxRedirects ?? DEFAULT_WEB_FETCH_OPTIONS.maxRedirects,
		maxOutputChars:
			options.maxOutputChars ?? DEFAULT_WEB_FETCH_OPTIONS.maxOutputChars,
	};
}
