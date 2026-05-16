import type { API } from '../../../api/index.js';
import type { CompilerTransform } from '../../../compiler/index.js';
import type { BaseRuntime } from '../../../runtime/index.js';
import { liftCompilerTransform as liftSimpleCompilerTransform } from '../../simple/transform/index.js';
import type { BaseState, StateExtensionModule } from '../types.js';

export type StateCompilerTransform<
	S extends BaseState,
	A extends API,
	InputRuntime extends BaseRuntime & A['In'],
	OutputRuntime extends InputRuntime,
> = (state: S) => CompilerTransform<A, InputRuntime, OutputRuntime>;

export type StateExtensionModuleTransform<
	S extends BaseState,
	A extends API,
	InputRuntime extends BaseRuntime & A['In'],
	OutputRuntime extends InputRuntime,
> = (
	module: StateExtensionModule<S, A, InputRuntime>,
) => StateExtensionModule<S, A, OutputRuntime>;

export function liftCompilerTransform<
	S extends BaseState,
	A extends API,
	InputRuntime extends BaseRuntime & A['In'],
	OutputRuntime extends InputRuntime,
>(
	transform: StateCompilerTransform<S, A, InputRuntime, OutputRuntime>,
): StateExtensionModuleTransform<S, A, InputRuntime, OutputRuntime> {
	return (module) => {
		return {
			emptyState: () => module.emptyState(),
			state: (runtime) => module.state(runtime),
			instantiate(state) {
				return liftSimpleCompilerTransform(transform(state))(
					module.instantiate(state),
				);
			},
		};
	};
}
