import type { CoreAPI } from '../../api/core/api.js';
import type { EnvironmentAPI } from '../../api/environment/api.js';
import type { StoreAPI } from '../../api/store/api.js';
import type { Extension } from '../../types/extension.js';
import { readFromCache, writeToCache } from './cache.js';
import { normalizeUrl } from './normalize.js';
import { toContentResult } from './result.js';
import { fetchUrlSpec } from './tools.js';
import {
	resolveWebFetchOptions,
	type WebFetchExtensionOptions,
} from './types.js';
import { webFetchCacheKey } from './key.js';

export function webFetchExtension(
	options: Partial<WebFetchExtensionOptions>,
): Extension<CoreAPI & EnvironmentAPI & StoreAPI> {

	const resolved = resolveWebFetchOptions(options);

	return (api) => {
		const store = api.registerStore(webFetchCacheKey, {}, 'shared');
		const web = api.getEnvironment().web;

		api.registerTool(fetchUrlSpec, async ({ url }) => {
			let normalizedUrl: string;
			try {
				normalizedUrl = normalizeUrl(url);
			} catch (error) {
				return {
					content: [
						{
							type: 'text' as const,
							text: `URL: ${url}\n\nInvalid URL: ${
								error instanceof Error ? error.message : String(error)
							}`,
						},
					],
					isError: true,
				};
			}

				const now = Date.now();
				const cached = readFromCache(store, normalizedUrl, resolved, now);
				if (cached) {
					// TODO: process for LLM
					return toContentResult(cached, true);
				}

				try {
					const response = await web.fetch({
						url: normalizedUrl,
						timeoutMs: resolved.timeoutMs,
						maxRedirects: resolved.maxRedirects,
					});
					
					if (response.body) {
						const entry = writeToCache(
							store,
							normalizedUrl,
							response,
							resolved,
							now,
						);
						// TODO: process for LLM
						return toContentResult(entry, false);
					}
					// TODO: process for LLM
					return toContentResult(response, false);
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
				return {
					content: [
						{
							type: 'text' as const,
							text: `URL: ${normalizedUrl}\n\nFetch failed: ${message}`,
						},
					],
					isError: true,
				};
			}
		});
	};
}
