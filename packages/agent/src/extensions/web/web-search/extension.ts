import {
	decorate,
	withOnlyHTTP,
	withRedirect,
	withTimeout,
} from '@franklin/lib';
import type { ConfigurationModule } from '@franklin/extensibility/module';
import { defineExtension } from '../../../modules/state/index.js';
import type { CoreModule } from '../../../modules/core/index.js';
import type { EnvironmentModule } from '../../../modules/environment/index.js';
import { toErrorMessage } from '../utils.js';
import { webSearchProviders } from './configuration.js';
import type {
	WebSearchProvider,
	WebSearchProviderRequest,
} from './provider.js';
import { toSearchError, toSearchResult } from './result.js';
import { searchWebSpec } from './tools.js';
import {
	resolveWebSearchOptions,
	type WebSearchExtensionOptions,
	type WebSearchResult,
} from './types.js';

type WebSearchModules = [CoreModule, EnvironmentModule, ConfigurationModule];

export function webSearchToolExtension(
	options: Partial<WebSearchExtensionOptions>,
) {
	const resolved = resolveWebSearchOptions(options);

	return defineExtension<WebSearchModules>((api) => {
		api.registerTool(searchWebSpec, async ({ query }, ctx) => {
			const fetch = decorate(ctx.environment.web.fetch)
				.with(withOnlyHTTP())
				.with(withRedirect(resolved.maxRedirects))
				.with(withTimeout(resolved.timeoutMs))
				.build();
			const providers = ctx.getConfig(webSearchProviders);
			if (providers.length === 0) {
				return toSearchError(
					query,
					new Error('No web search providers configured'),
				);
			}

			const request = { query, fetch, options: resolved };
			const result = await runWebSearchProviders(providers, request);
			if (result.kind === 'success') {
				return toSearchResult(query, result.results);
			}

			return toSearchError(query, result.error);
		});
	});
}

export function webSearchExtension(
	options: Partial<WebSearchExtensionOptions>,
) {
	return webSearchToolExtension(options);
}

type WebSearchProviderRunResult =
	| {
			readonly kind: 'success';
			readonly results: readonly WebSearchResult[];
	  }
	| {
			readonly kind: 'error';
			readonly error: Error;
	  };

async function runWebSearchProviders(
	providers: readonly WebSearchProvider[],
	request: WebSearchProviderRequest,
): Promise<WebSearchProviderRunResult> {
	const failures: string[] = [];

	for (const provider of providers) {
		try {
			return {
				kind: 'success',
				results: await provider.search(request),
			};
		} catch (error) {
			failures.push(`${provider.name} failed: ${toErrorMessage(error)}`);
		}
	}

	return {
		kind: 'error',
		error: new Error(failures.join('. ')),
	};
}
