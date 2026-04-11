import type { RuntimeSystem } from '../../runtime-system/types.js';
import type { SessionRuntime } from '../../runtime/index.js';
import type { Session } from '../../runtime/session/types.js';

export type SessionAPI<RTS extends RuntimeSystem<any, any, any>> = {
	session: {
		createChild: () => Promise<Session<SessionRuntime<RTS>>>;
		createFork: () => Promise<Session<SessionRuntime<RTS>>>;
		removeSelf: () => Promise<boolean>;
	};
};
