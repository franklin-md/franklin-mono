import type { ClientProtocol, CtxTracker } from '@franklin/mini-acp';
import type { Agent } from '../../types.js';

export type SpawnFn = () => ClientProtocol | Promise<ClientProtocol>;

//TODO: Should we move the listeners in here?
export type Session = {
	sessionId: string;
	agent: Agent;
	tracker: CtxTracker;
};
