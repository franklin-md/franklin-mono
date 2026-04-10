import type { SessionAPI } from '../api/session/api.js';
import type { Compiler } from '../compile/types.js';
import type { RuntimeSystem } from './types.js';
import type { SessionState } from '../state/session.js';
import { emptyState } from '../state/empty.js';
import type { SessionRuntime } from '../runtime/session/runtime.js';
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
		emptyState: emptyState,

		async createCompiler(
			state: SessionState,
		): Promise<Compiler<SessionAPI, SessionRuntime>> {
			// TODO: SesssionRuntime needs to create child and fork from the id.
			// possible if you know what id you are... But how do we get that?
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
