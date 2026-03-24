import type { PersistedCtx } from './persist/types.js';

function cloneHistory(
	history: PersistedCtx['history'],
): PersistedCtx['history'] {
	return {
		systemPrompt: history.systemPrompt,
		messages: [...history.messages],
	};
}

function cloneConfig(config: PersistedCtx['config']): PersistedCtx['config'] {
	return config ? { ...config } : config;
}

export function emptyCtx(): PersistedCtx {
	return {
		history: {
			systemPrompt: '',
			messages: [],
		},
	};
}

export function cloneCtx(ctx: PersistedCtx): PersistedCtx {
	return {
		history: cloneHistory(ctx.history),
		config: cloneConfig(ctx.config),
	};
}

export function mergeCtx(
	base: PersistedCtx,
	overrides: Partial<PersistedCtx> = {},
): PersistedCtx {
	return {
		history: cloneHistory(overrides.history ?? base.history),
		config: Object.hasOwn(overrides, 'config')
			? cloneConfig(overrides.config)
			: cloneConfig(base.config),
	};
}
