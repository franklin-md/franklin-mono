import type { ThinkingLevel } from '@franklin/mini-acp';

import type { PersistedCtx } from './persist/types.js';

export type ConfigOptions = {
	model?: string;
	provider?: string;
	reasoning?: ThinkingLevel;
};

export function sameConfig(
	left: PersistedCtx['config'],
	right: PersistedCtx['config'],
): boolean {
	return (
		left?.model === right?.model &&
		left?.provider === right?.provider &&
		left?.reasoning === right?.reasoning &&
		left?.apiKey === right?.apiKey
	);
}

export function createResolvedConfig(
	config: ConfigOptions,
	provider: string | undefined,
	apiKey: string | undefined,
): PersistedCtx['config'] {
	const resolved = {
		...(config.model !== undefined ? { model: config.model } : {}),
		...(provider !== undefined ? { provider } : {}),
		...(config.reasoning !== undefined ? { reasoning: config.reasoning } : {}),
		...(apiKey !== undefined ? { apiKey } : {}),
	};

	return Object.keys(resolved).length > 0 ? resolved : undefined;
}
