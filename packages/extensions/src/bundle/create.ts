import type { StoreKey } from '../api/store/key.js';
import type { ToolSpec } from '../api/core/tool-spec.js';
import type { Extension } from '../types/extension.js';
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
