import type { ClientProtocol, CtxTracker } from '@franklin/mini-acp';
import type { Agent } from '../types.js';

export type SpawnFn = () => ClientProtocol | Promise<ClientProtocol>;

export type Session = {
	sessionId: string;
	agent: Agent;
	tracker: CtxTracker;
};

export type SessionOptions = {
	systemPrompt?: string;
};
