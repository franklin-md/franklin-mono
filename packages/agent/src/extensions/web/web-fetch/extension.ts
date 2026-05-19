import {
	decorate,
	normalizeUrl,
	withOnlyHTTP,
	withRedirect,
	withTimeout,
} from '@franklin/lib';
import { defineExtension } from '../../../modules/state/index.js';
import type { CoreModule } from '../../../modules/core/index.js';
import type { EnvironmentModule } from '../../../modules/environment/index.js';
import { processWebResponse } from './process.js';
import { toContentResult } from './result.js';
import { fetchUrlSpec } from './tools.js';
import {
	resolveWebFetchOptions,
	type WebFetchExtensionOptions,
} from './types.js';

export function webFetchExtension(options: Partial<WebFetchExtensionOptions>) {
	const resolved = resolveWebFetchOptions(options);

	return defineExtension<[CoreModule, EnvironmentModule]>((api) => {
		api.registerTool(fetchUrlSpec, async ({ url }, ctx) => {
			const boundedFetch = decorate(ctx.environment.web.fetch)
				.with(withOnlyHTTP())
				.with(withRedirect(resolved.maxRedirects))
				.with(withTimeout(resolved.timeoutMs))
				.build();
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

			try {
				const response = await boundedFetch({
					url: normalizedUrl,
					method: 'GET',
				});
				const processed = processWebResponse(response, resolved);
				return toContentResult(processed);
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
