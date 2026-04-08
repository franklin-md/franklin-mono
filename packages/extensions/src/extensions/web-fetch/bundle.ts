import { createBundle } from '../../bundle/create.js';
import { webFetchExtension as buildWebFetchExtension } from './extension.js';
import { webFetchCacheKey } from './key.js';
import { fetchUrlSpec } from './tools.js';
import type { WebFetchExtensionOptions } from './types.js';

export function createWebFetchExtension(options: Partial<WebFetchExtensionOptions>) {
	return createBundle({
		extension: buildWebFetchExtension(options),
		keys: { cache: webFetchCacheKey },
		tools: { fetchUrl: fetchUrlSpec },
	});
}
