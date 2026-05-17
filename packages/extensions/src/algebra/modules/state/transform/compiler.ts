import type { API } from '../../../api/index.js';
import type { BaseRuntime } from '../../../runtime/index.js';
import { liftCompilerTransform as liftSimpleCompilerTransform } from '../../simple/transform/index.js';
import type { BaseState } from '../types.js';
import type {
	StateCompilerTransform,
	StateExtensionModuleTransform,
	StateModuleTransform,
} from './types.js';

export function liftModuleTransform<
	S extends BaseState,
	A extends API,
	InputRuntime extends BaseRuntime & A['In'],
	OutputRuntime extends InputRuntime,
>(
	transform: StateModuleTransform<S, A, InputRuntime, OutputRuntime>,
): StateExtensionModuleTransform<S, A, InputRuntime, OutputRuntime> {
	return (module) => {
		return {
			emptyState: () => module.emptyState(),
			state: (runtime) => module.state(runtime),
			instantiate(state) {
				return transform(state)(module.instantiate(state));
			},
		};
	};
}

export function liftCompilerTransform<
	S extends BaseState,
	A extends API,
	InputRuntime extends BaseRuntime & A['In'],
	OutputRuntime extends InputRuntime,
>(
	transform: StateCompilerTransform<S, A, InputRuntime, OutputRuntime>,
): StateExtensionModuleTransform<S, A, InputRuntime, OutputRuntime> {
	return liftModuleTransform((state) =>
		liftSimpleCompilerTransform(transform(state)),
	);
}
