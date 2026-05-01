import type { StoreKey } from '../../../systems/store/api/key.js';
import type { ToolSpec } from '../../../systems/core/api/tool-spec.js';
import type { Extension } from '../../extension/index.js';

export type ExtensionBundle<
	TKeys extends Record<string, StoreKey<string, any>> = Record<string, never>,
	TTools extends Record<string, ToolSpec> = Record<string, never>,
> = {
	readonly extension: Extension<any>;
	readonly keys: TKeys;
	readonly tools: TTools;
};
