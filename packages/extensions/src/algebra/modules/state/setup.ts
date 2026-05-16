import type { Signature } from '../../api/index.js';
import type { BaseRuntime } from '../../runtime/index.js';
import { withSetup as withSimpleSetup } from '../simple/setup.js';
import type { BaseState, StateExtensionModule } from './types.js';

export function withSetup<
	State extends BaseState,
	S extends Signature,
	Runtime extends BaseRuntime & S['In'],
>(
	module: StateExtensionModule<State, S, Runtime>,
	setup: (runtime: Runtime, state: State) => Promise<void>,
): StateExtensionModule<State, S, Runtime> {
	return {
		emptyState: () => module.emptyState(),
		state: (runtime) => module.state(runtime),
		instantiate(state) {
			return withSimpleSetup(module.instantiate(state), (runtime) =>
				setup(runtime, state),
			);
		},
	};
}
