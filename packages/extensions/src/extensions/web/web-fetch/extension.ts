import {
	decorate,
	normalizeUrl,
	withOnlyHTTP,
	withRedirect,
	withTimeout,
} from '@franklin/lib';
import { createExtension } from '../../../algebra/index.js';
import type { CoreAPI } from '../../../modules/core/index.js';
import type { EnvironmentRuntime } from '../../../modules/environment/runtime.js';
import type { StoreAPI } from '../../../modules/store/index.js';
import type { StoreRuntime } from '../../../modules/store/runtime.js';
import { readFromCache, writeToCache } from './cache.js';
import { webFetchCacheKey } from './key.js';
import { processWebResponse } from './process.js';
import { toContentResult } from './result.js';
import { fetchUrlSpec } from './tools.js';
import {
	resolveWebFetchOptions,
	type WebFetchExtensionOptions,
} from './types.js';

export function webFetchExtension(options: Partial<WebFetchExtensionOptions>) {
	const resolved = resolveWebFetchOptions(options);

	return createExtension<
		[CoreAPI, StoreAPI],
		[EnvironmentRuntime, StoreRuntime]
	>((api) => {
		api.registerStore(webFetchCacheKey, {}, 'shared');

		api.registerTool(fetchUrlSpec, async ({ url }, ctx) => {
			const boundedFetch = decorate(ctx.environment.web.fetch)
				.with(withOnlyHTTP())
				.with(withRedirect(resolved.maxRedirects))
				.with(withTimeout(resolved.timeoutMs))
				.build();
			const store = ctx.getStore(webFetchCacheKey);
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
				const processed = processWebResponse(cached, resolved);
				return toContentResult(processed, true);
			}

			try {
				const response = await boundedFetch({
					url: normalizedUrl,
					method: 'GET',
				});
				// We process the response, and if it is an error of any
				// kind, we DO NOT cache it
				const processed = processWebResponse(response, resolved);
				if (!processed.isError) {
					writeToCache(store, normalizedUrl, response, resolved, now);
				}

				return toContentResult(processed, false);
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
	});
}
