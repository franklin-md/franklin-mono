import type { SessionState } from '../../../types.js';

export type SessionSnapshot = {
	sessionId: string;
	state: SessionState;
};
