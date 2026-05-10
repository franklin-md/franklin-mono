import { createBundle } from '../../modules/bundle/index.js';
import { reduceExtensions } from '../../algebra/extension/index.js';
import { webFetchCacheKey } from './web-fetch/key.js';
import { fetchUrlSpec } from './web-fetch/tools.js';
import type { WebFetchExtensionOptions } from './web-fetch/types.js';
import { webFetchExtension } from './web-fetch/extension.js';
import { webSearchExtension } from './web-search/extension.js';
import { searchWebSpec } from './web-search/tools.js';
import type { WebSearchExtensionOptions } from './web-search/types.js';

export interface WebExtensionOptions {
	fetch?: Partial<WebFetchExtensionOptions>;
	search?: Partial<WebSearchExtensionOptions>;
}

export function createWebExtension(options: WebExtensionOptions = {}) {
	return createBundle({
		extension: reduceExtensions(
			webFetchExtension(options.fetch ?? {}),
			webSearchExtension(options.search ?? {}),
		),
		keys: { cache: webFetchCacheKey },
		tools: {
			fetchUrl: fetchUrlSpec,
			searchWeb: searchWebSpec,
		},
	});
}
