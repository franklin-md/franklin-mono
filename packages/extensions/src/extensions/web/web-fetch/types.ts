export interface WebFetchExtensionOptions {
	timeoutMs: number;
	maxRedirects: number;
	maxOutputChars: number;
}

export type WebFetchProcessedResult = {
	kind: 'pdf' | 'html' | 'text' | 'http_error' | 'error';
	content: string;
	isError: boolean;
	truncated: boolean;
};

export const DEFAULT_WEB_FETCH_OPTIONS: WebFetchExtensionOptions = {
	timeoutMs: 8000,
	maxRedirects: 5,
	maxOutputChars: 20_000,
};

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
