import { type SessionState, freshSessionState } from '../../state/session.js';
import type { RuntimeBase } from '../types.js';
import type { SessionRuntime } from './runtime.js';
import type { SessionTree } from './tree.js';

export function createSessionRuntime<
	S extends SessionState,
	RT extends RuntimeBase<S> & SessionRuntime,
>(sessionId: string, tree: SessionTree<S, RT>): SessionRuntime {
	return {
		session: {
			child: async () => tree.child(sessionId),
			fork: async () => tree.fork(sessionId),
		},

		async state(): Promise<SessionState> {
			return { session: { id: sessionId } };
		},
		async fork(): Promise<SessionState> {
			return freshSessionState();
		},
		async child(): Promise<SessionState> {
			return freshSessionState();
		},
		async dispose(): Promise<void> {},
		subscribe: () => () => {},
	};
}
