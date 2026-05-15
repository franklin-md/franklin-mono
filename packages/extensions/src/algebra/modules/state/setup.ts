import type { API } from '../../api/index.js';
import type { BaseRuntime } from '../../runtime/index.js';
import { withSetup as withSimpleSetup } from '../simple/setup.js';
import type { BaseState, StateExtensionModule } from './types.js';

export function withSetup<
	S extends BaseState,
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	module: StateExtensionModule<S, A, Runtime>,
	setup: (runtime: Runtime, state: S) => Promise<void>,
): StateExtensionModule<S, A, Runtime> {
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
