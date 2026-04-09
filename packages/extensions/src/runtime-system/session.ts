import type { SessionAPI } from '../api/session/api.js';
import type { Compiler } from '../compile/types.js';
import type { RuntimeSystem } from './types.js';
import type { SessionState } from '../state/session.js';
import { freshSessionState } from '../state/session.js';
import type { SessionRuntime } from '../runtime/session/runtime.js';
import { createSessionRuntime } from '../runtime/session/create.js';
import type { SessionTree } from '../runtime/session/tree.js';
import type { RuntimeBase } from '../runtime/types.js';

export type SessionSystem = RuntimeSystem<
	SessionState,
	SessionAPI,
	SessionRuntime
>;

export function createSessionSystem<
	S extends SessionState,
	RT extends RuntimeBase<S> & SessionRuntime,
>(tree: SessionTree<S, RT>): SessionSystem {
	return {
		emptyState: freshSessionState,

		async createCompiler(
			state: SessionState,
		): Promise<Compiler<SessionAPI, SessionRuntime>> {
			const sessionId = state.session.id;
			const runtime = createSessionRuntime(sessionId, tree);
			return {
				api: { getSession: () => runtime },
				async build() {
					return runtime;
				},
			};
		},
	};
}
