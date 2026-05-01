import type { StoreKey } from '../../../systems/store/api/index.js';
import type { ToolSpec } from '../../../systems/core/api/index.js';
import type { Extension } from '../../extension/index.js';
import type { ExtensionBundle } from './types.js';

export function createBundle<
	TKeys extends Record<string, StoreKey<string, any>>,
	TTools extends Record<string, ToolSpec>,
>(config: {
	extension: Extension<any>;
	keys: TKeys;
	tools: TTools;
}): ExtensionBundle<TKeys, TTools> {
	return config;
}
