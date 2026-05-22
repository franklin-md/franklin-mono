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
import {
	renderSearchOutput,
	toSearchErrorOutput,
	toSearchOutput,
} from './result.js';
import { searchWebSpec } from './tools.js';
import {
	resolveWebSearchOptions,
	type WebSearchExtensionOptions,
	type WebSearchOutput,
	type WebSearchProviderFailure,
	type WebSearchProviderMetadata,
} from './types.js';

type WebSearchModules = [CoreModule, EnvironmentModule, ConfigurationModule];

export function webSearchToolExtension(
	options: Partial<WebSearchExtensionOptions>,
) {
	const resolved = resolveWebSearchOptions(options);

	return defineExtension<WebSearchModules>((api) => {
		api.registerTool(searchWebSpec, {
			execute: async ({ query }, ctx) => {
				const fetch = decorate(ctx.environment.web.fetch)
					.with(withOnlyHTTP())
					.with(withRedirect(resolved.maxRedirects))
					.with(withTimeout(resolved.timeoutMs))
					.build();
				const providers = ctx.getConfig(webSearchProviders);
				if (providers.length === 0) {
					return toSearchErrorOutput(
						query,
						'No web search providers configured',
					);
				}

				const request = { query, fetch, options: resolved };
				return runWebSearchProviders(query, providers, request);
			},
			render: renderSearchOutput,
		});
	});
}

export function webSearchExtension(
	options: Partial<WebSearchExtensionOptions>,
) {
	return webSearchToolExtension(options);
}

async function runWebSearchProviders(
	query: string,
	providers: readonly WebSearchProvider[],
	request: WebSearchProviderRequest,
): Promise<WebSearchOutput> {
	const failures: WebSearchProviderFailure[] = [];

	for (const provider of providers) {
		const providerMetadata = toProviderMetadata(provider);
		try {
			return toSearchOutput(
				query,
				providerMetadata,
				await provider.search(request),
			);
		} catch (error) {
			failures.push({
				provider: providerMetadata,
				message: toErrorMessage(error),
			});
		}
	}

	return toSearchErrorOutput(
		query,
		failures
			.map((failure) => `${failure.provider.name} failed: ${failure.message}`)
			.join('. '),
		failures,
	);
}

function toProviderMetadata(
	provider: WebSearchProvider,
): WebSearchProviderMetadata {
	if (provider.id === undefined) {
		return { name: provider.name };
	}

	return {
		id: provider.id,
		name: provider.name,
	};
}
