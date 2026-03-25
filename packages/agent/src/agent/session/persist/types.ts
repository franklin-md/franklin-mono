import type { Ctx } from '@franklin/mini-acp';
import type { StoreMapping } from '@franklin/extensions';

export type {
	Filesystem,
	Persister,
} from '@franklin/lib';
export type { StoreSnapshot } from '@franklin/extensions';

export type PersistedCtx = Pick<Ctx, 'history' | 'config'>;

export type SessionSnapshot = {
	sessionId: string;
	ctx: PersistedCtx;
	stores: StoreMapping;
};
