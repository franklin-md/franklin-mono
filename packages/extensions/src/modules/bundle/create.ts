import type { StoreKey } from '../store/api/index.js';
import type { ToolSpec } from '../core/api/index.js';
import type { Extension } from '../../algebra/extension/index.js';
import type { ExtensionBundle } from './types.js';

export function createBundle<
	TKeys extends Record<string, StoreKey<string, unknown>>,
	TTools extends Record<string, ToolSpec>,
>(config: {
	extension: Extension;
	keys: TKeys;
	tools: TTools;
}): ExtensionBundle<TKeys, TTools> {
	return config;
}
