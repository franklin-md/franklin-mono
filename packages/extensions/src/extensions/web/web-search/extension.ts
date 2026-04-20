import type { CoreAPI } from '../../../systems/core/index.js';
import type { EnvironmentRuntime } from '../../../systems/environment/runtime.js';
import type { Extension } from '../../../algebra/types/index.js';
import { toSearchError, toSearchResult } from './result.js';
import { searchWebSpec } from './tools.js';
import { searchWithDdg } from './ddg.js';
import { searchWithExa } from './exa.js';
import {
	resolveWebSearchOptions,
	type WebSearchExtensionOptions,
} from './types.js';

export function webSearchExtension(
	options: Partial<WebSearchExtensionOptions>,
): Extension<CoreAPI<EnvironmentRuntime>> {
	const resolved = resolveWebSearchOptions(options);

	return (api) => {
		api.registerTool(searchWebSpec, async ({ query }, ctx) => {
			const web = ctx.environment.web;
			try {
				const results = await searchWithExa(web, query, resolved);
				return toSearchResult(query, results);
			} catch (exaError) {
				try {
					const results = await searchWithDdg(web, query, resolved);
					return toSearchResult(query, results);
				} catch (ddgError) {
					return toSearchError(query, combineSearchErrors(exaError, ddgError));
				}
			}
		});
	};
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
