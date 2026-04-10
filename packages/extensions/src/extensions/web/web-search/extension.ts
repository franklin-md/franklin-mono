import type { CoreAPI } from '../../../api/core/api.js';
import type { EnvironmentAPI } from '../../../api/environment/api.js';
import type { Extension } from '../../../types/extension.js';
import { decodeBody, normalizeContentType } from '../utils.js';
import { parseDdgLite } from './parse.js';
import { toSearchError, toSearchResult } from './result.js';
import { searchWebSpec } from './tools.js';
import {
	resolveWebSearchOptions,
	type WebSearchExtensionOptions,
} from './types.js';
import { pickUserAgent } from './user-agents.js';

export function webSearchExtension(
	options: Partial<WebSearchExtensionOptions>,
): Extension<CoreAPI & EnvironmentAPI> {
	const resolved = resolveWebSearchOptions(options);

	return (api) => {
		const web = api.getEnvironment().web;

		api.registerTool(searchWebSpec, async ({ query }) => {
			const url = `https://duckduckgo.com/lite?q=${encodeURIComponent(query)}`;

			let lastError: unknown;
			for (let attempt = 0; attempt < resolved.maxRetries; attempt++) {
				if (attempt > 0) {
					await sleep(randomDelay(resolved.retryDelayMsRange));
				}

				try {
					const response = await web.fetch({
						url,
						timeoutMs: resolved.timeoutMs,
						maxRedirects: resolved.maxRedirects,
						headers: { 'User-Agent': pickUserAgent() },
					});

					if (response.status < 200 || response.status >= 300) {
						lastError = new Error(
							`HTTP ${response.status} ${response.statusText}`,
						);
						continue;
					}

					if (normalizeContentType(response.contentType) !== 'text/html') {
						return toSearchError(
							query,
							new Error(
								"Unsupported content type: ${response.contentType ?? 'unknown",
							),
						);
					}

					const html = decodeBody(response.body);
					const results = parseDdgLite(html, resolved.maxResults);
					return toSearchResult(query, results);
				} catch (error) {
					lastError = error;
				}
			}

			return toSearchError(query, lastError ?? new Error('Unknown error'));
		});
	};
}

function randomDelay([min, max]: [number, number]): number {
	return min + Math.floor(Math.random() * Math.max(0, max - min));
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
