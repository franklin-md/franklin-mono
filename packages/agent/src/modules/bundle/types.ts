import type { StoreKey } from '../store/api/key.js';
import type { ToolSpec } from '../core/api/tool-spec.js';
import type { Extension } from '@franklin/extensibility';

export type ExtensionBundle<
	TKeys extends Record<string, StoreKey<string, unknown>> = Record<
		string,
		never
	>,
	TTools extends Record<string, ToolSpec> = Record<string, never>,
> = {
	readonly extension: Extension;
	readonly keys: TKeys;
	readonly tools: TTools;
};
