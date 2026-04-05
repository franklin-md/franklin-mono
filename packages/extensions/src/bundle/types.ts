import type { StoreKey } from '../api/store/key.js';
import type { ToolSpec } from '../api/core/tool-spec.js';
import type { Extension } from '../types/extension.js';

export type ExtensionBundle<
	TKeys extends Record<string, StoreKey<string, any>> = Record<string, never>,
	TTools extends Record<string, ToolSpec> = Record<string, never>,
> = {
	readonly extension: Extension<any>;
	readonly keys: TKeys;
	readonly tools: TTools;
};
