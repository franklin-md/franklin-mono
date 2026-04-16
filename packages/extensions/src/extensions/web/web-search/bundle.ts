import { createBundle } from '../../../algebra/bundle/create.js';
import { webSearchExtension as buildWebSearchExtension } from './extension.js';
import { searchWebSpec } from './tools.js';
import type { WebSearchExtensionOptions } from './types.js';

export function createWebSearchExtension(
	options: Partial<WebSearchExtensionOptions>,
) {
	return createBundle({
		extension: buildWebSearchExtension(options),
		keys: {},
		tools: { searchWeb: searchWebSpec },
	});
}
