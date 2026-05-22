import type { StoreKey } from '../store/api/key.js';
import type { ToolSpec } from '../core/api/tool-spec.js';
import type { Extension } from '@franklin/extensibility';
import type { JsonValue } from '@franklin/lib';

export type ExtensionBundle<
	TKeys extends Record<string, StoreKey<string, JsonValue>> = Record<
		string,
		never
	>,
	TTools extends Record<string, ToolSpec> = Record<string, never>,
> = {
	readonly extension: Extension;
	readonly keys: TKeys;
	readonly tools: TTools;
};
