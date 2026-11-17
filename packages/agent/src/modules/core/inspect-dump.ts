import type { Context } from '@franklin/mini-acp';

export type CoreInspectDump = {
	readonly core: Context;
	/** Estimated tokens in the current projected context, including system/tools. */
	readonly contextTokens: number;
};
