import type { API } from '../../algebra/api/index.js';
export { withSetupCompiler } from '../../algebra/compiler/index.js';
import { withSetup as withStateSetup } from '../../algebra/modules/state/index.js';
import type { BaseState } from '../../algebra/modules/state/index.js';
import type { BaseRuntime } from '../../algebra/runtime/index.js';
import type { HarnessModule } from './module.js';

export function withSetup<
	S extends BaseState,
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	module: HarnessModule<S, A, Runtime>,
	setup: (runtime: Runtime, state: S) => Promise<void>,
): HarnessModule<S, A, Runtime> {
	return withStateSetup(module, setup);
}
