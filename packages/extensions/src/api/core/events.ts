import type { MiniACPClient } from '@franklin/mini-acp';
import type { MaybePromise } from '../../types/shared.js';

// ---------------------------------------------------------------------------
// Core events — derived 1:1 from MiniACPClient methods
// ---------------------------------------------------------------------------

export type CoreEvent = keyof MiniACPClient;

export type CoreEventHandler<K extends CoreEvent> = (
	params: Parameters<MiniACPClient[K]>[0],
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
) => MaybePromise<Parameters<MiniACPClient[K]>[0] | void>;

export type CoreEventMap = {
	[K in CoreEvent]: CoreEventHandler<K>;
};
