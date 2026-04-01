import type { ClientProtocol, CtxTracker } from '@franklin/mini-acp';
import type { Environment } from '@franklin/extensions';
import type { Agent } from '../../types.js';

export type SpawnFn = () => ClientProtocol | Promise<ClientProtocol>;

//TODO: Should we move the listeners in here?
export type Session = {
	sessionId: string;
	// TODO: Might this make sense to move into Agent?
	tracker: CtxTracker;

	agent: Agent;
	environment: Environment;
};
