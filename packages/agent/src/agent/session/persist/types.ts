import type { Ctx } from '@franklin/mini-acp';
import type { StoreMapping } from '@franklin/extensions';

// TODO: We should avoid Persisting the apiKeys here.
// Instead we can rehydrate from the AuthStore on login.Looks
export type PersistedCtx = Pick<Ctx, 'history' | 'config'>;

export type SessionSnapshot = {
	sessionId: string;
	ctx: PersistedCtx;
	stores: StoreMapping;
};
