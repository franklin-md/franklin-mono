import type { Signature } from '../../../api/index.js';
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
	Api extends Signature,
	InputRuntime extends BaseRuntime & Api['In'],
	OutputRuntime extends InputRuntime,
>(
	transform: StateModuleTransform<S, Api, InputRuntime, OutputRuntime>,
): StateExtensionModuleTransform<S, Api, InputRuntime, OutputRuntime> {
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
	Api extends Signature,
	InputRuntime extends BaseRuntime & Api['In'],
	OutputRuntime extends InputRuntime,
>(
	transform: StateCompilerTransform<S, Api, InputRuntime, OutputRuntime>,
): StateExtensionModuleTransform<S, Api, InputRuntime, OutputRuntime> {
	return liftModuleTransform((state) =>
		liftSimpleCompilerTransform(transform(state)),
	);
}
