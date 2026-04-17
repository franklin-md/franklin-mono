import type { BaseRuntimeSystem } from '../../../algebra/system/types.js';
import type { SessionRuntime } from '../runtime/runtime.js';
import type { Session } from '../runtime/types.js';

export type SessionAPI<RTS extends BaseRuntimeSystem> = {
	session: {
		createChild: () => Promise<Session<SessionRuntime<RTS>>>;
		createFork: () => Promise<Session<SessionRuntime<RTS>>>;
		removeSelf: () => Promise<boolean>;
	};
};
