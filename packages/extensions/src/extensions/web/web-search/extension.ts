import {
	decorate,
	withOnlyHTTP,
	withRedirect,
	withTimeout,
} from '@franklin/lib';
import { defineExtension } from '../../../harness/modules/index.js';
import type { CoreModule } from '../../../modules/core/index.js';
import type { EnvironmentModule } from '../../../modules/environment/index.js';
import { searchWithDdg } from './ddg.js';
import { searchWithExa } from './exa.js';
import { toSearchError, toSearchResult } from './result.js';
import { searchWebSpec } from './tools.js';
import {
	resolveWebSearchOptions,
	type WebSearchExtensionOptions,
} from './types.js';

export function webSearchExtension(
	options: Partial<WebSearchExtensionOptions>,
) {
	const resolved = resolveWebSearchOptions(options);

	return defineExtension<[CoreModule, EnvironmentModule]>((api) => {
		api.registerTool(searchWebSpec, async ({ query }, ctx) => {
			const fetch = decorate(ctx.environment.web.fetch)
				.with(withOnlyHTTP())
				.with(withRedirect(resolved.maxRedirects))
				.with(withTimeout(resolved.timeoutMs))
				.build();
			try {
				const results = await searchWithExa(fetch, query, resolved);
				return toSearchResult(query, results);
			} catch (exaError) {
				try {
					const results = await searchWithDdg(fetch, query, resolved);
					return toSearchResult(query, results);
				} catch (ddgError) {
					return toSearchError(query, combineSearchErrors(exaError, ddgError));
				}
			}
		});
	});
}

function combineSearchErrors(exaError: unknown, ddgError: unknown): Error {
	const exaMessage =
		exaError instanceof Error ? exaError.message : String(exaError);
	const ddgMessage =
		ddgError instanceof Error ? ddgError.message : String(ddgError);
	return new Error(
		`Exa MCP failed: ${exaMessage}. DuckDuckGo fallback failed: ${ddgMessage}`,
	);
}
