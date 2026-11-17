import type { Context } from '@franklin/mini-acp';

export type CoreInspectDump = {
	/** Last-sent context for debugging; not the canonical session projection. */
	readonly core: Context;
	/**
	 * Estimates projected messages plus the last-synchronized system/tools (absent
	 * before the first sync). This need not match the debugging snapshot in `core`.
	 */
	readonly contextTokens: number;
};
