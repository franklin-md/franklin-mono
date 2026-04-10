import type { WebAPI } from '../../../api/environment/types.js';
import { decodeBody, normalizeContentType } from '../utils.js';
import { parseDdgLite } from './parse.js';
import type { WebSearchExtensionOptions, WebSearchResult } from './types.js';
import { pickUserAgent } from './user-agents.js';

export async function searchWithDdg(
	web: WebAPI,
	query: string,
	options: WebSearchExtensionOptions,
): Promise<WebSearchResult[]> {
	const url = `https://duckduckgo.com/lite?q=${encodeURIComponent(query)}`;

	let lastError: unknown;
	for (let attempt = 0; attempt < options.maxRetries; attempt++) {
		if (attempt > 0) {
			await sleep(randomDelay(options.retryDelayMsRange));
		}

		try {
			const response = await web.fetch({
				url,
				method: 'GET',
				timeoutMs: options.timeoutMs,
				maxRedirects: options.maxRedirects,
				headers: { 'User-Agent': pickUserAgent() },
			});

			if (response.status < 200 || response.status >= 300) {
				lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
				continue;
			}

			if (normalizeContentType(response.contentType) !== 'text/html') {
				throw new Error(
					`Unsupported content type: ${response.contentType ?? 'unknown'}`,
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

function randomDelay([min, max]: [number, number]): number {
	return min + Math.floor(Math.random() * Math.max(0, max - min));
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
