import type { WebFetchResponse } from '@franklin/lib';

export interface WebFetchExtensionOptions {
	timeoutMs: number;
	maxResponseBytes: number;
	maxRedirects: number;
	cacheTtlMs: number;
	cacheMaxEntries: number;
	maxOutputChars: number;
}

export type WebFetchCacheEntry = WebFetchResponse & {
	storedAt: number;
	expiresAt: number;
	lastAccessedAt: number;
};

export type WebFetchCache = Record<string, WebFetchCacheEntry>;

export type WebFetchProcessedResult = {
	kind: 'pdf' | 'html' | 'text' | 'http_error' | 'error';
	content: string;
	isError: boolean;
	truncated: boolean;
};

export const DEFAULT_WEB_FETCH_OPTIONS: WebFetchExtensionOptions = {
	timeoutMs: 8000,
	maxResponseBytes: 5_000_000,
	maxRedirects: 5,
	cacheTtlMs: 15 * 60 * 1000,
	cacheMaxEntries: 20,
	maxOutputChars: 20_000,
};

export function resolveWebFetchOptions(
	options: Partial<WebFetchExtensionOptions> = {},
): WebFetchExtensionOptions {
	return {
		timeoutMs: options.timeoutMs ?? DEFAULT_WEB_FETCH_OPTIONS.timeoutMs,
		maxResponseBytes:
			options.maxResponseBytes ?? DEFAULT_WEB_FETCH_OPTIONS.maxResponseBytes,
		maxRedirects:
			options.maxRedirects ?? DEFAULT_WEB_FETCH_OPTIONS.maxRedirects,
		cacheTtlMs: options.cacheTtlMs ?? DEFAULT_WEB_FETCH_OPTIONS.cacheTtlMs,
		cacheMaxEntries:
			options.cacheMaxEntries ?? DEFAULT_WEB_FETCH_OPTIONS.cacheMaxEntries,
		maxOutputChars:
			options.maxOutputChars ?? DEFAULT_WEB_FETCH_OPTIONS.maxOutputChars,
	};
}
