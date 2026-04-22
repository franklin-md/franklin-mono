import { wait, randomDelay } from '@franklin/lib';
import type { Fetch } from '@franklin/lib';
import { decodeBody, normalizeContentType } from '../utils.js';
import { parseDdgLite } from './parse.js';
import type { WebSearchExtensionOptions, WebSearchResult } from './types.js';
import { pickUserAgent } from './user-agents.js';

export async function searchWithDdg(
	fetch: Fetch,
	query: string,
	options: WebSearchExtensionOptions,
): Promise<WebSearchResult[]> {
	const url = `https://duckduckgo.com/lite?q=${encodeURIComponent(query)}`;

	let lastError: unknown;
	// AGENT-TODO: The retry mechanism could be a withRetry decorator
	for (let attempt = 0; attempt < options.maxRetries; attempt++) {
		if (attempt > 0) {
			await wait(randomDelay(options.retryDelayMsRange));
		}

		try {
			const response = await fetch({
				url,
				method: 'GET',
				headers: { 'User-Agent': pickUserAgent() },
			});

			if (response.status < 200 || response.status >= 300) {
				lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
				continue;
			}

			const contentType = response.headers['content-type'];
			if (normalizeContentType(contentType) !== 'text/html') {
				throw new Error(
					`Unsupported content type: ${contentType ?? 'unknown'}`,
				);
			}

			const html = decodeBody(response.body);
			return parseDdgLite(html, options.maxResults);
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError instanceof Error ? lastError : new Error('Unknown error');
}
