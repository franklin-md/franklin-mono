import type { StoreSnapshot } from '@franklin/extensions';
import type { Ctx } from '@franklin/mini-acp';

export type { FileSystemOps, Persister } from '@franklin/lib';
export type { StoreSnapshot } from '@franklin/extensions';

export type PersistedCtx = Pick<Ctx, 'history' | 'config'>;

export type SessionSnapshot = {
	sessionId: string;
	ctx: PersistedCtx;
	stores: Record<string, StoreSnapshot>;
};
