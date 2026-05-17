import type { API } from '../../../api/index.js';
import type { CompilerTransform } from '../../../compiler/transform/types.js';
import type { BaseRuntime } from '../../../runtime/index.js';
import type { ExtensionModuleTransform } from '../../simple/transform/types.js';
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

export type StateModuleTransform<
	S extends BaseState,
	A extends API,
	InputRuntime extends BaseRuntime & A['In'],
	OutputRuntime extends InputRuntime,
> = (state: S) => ExtensionModuleTransform<A, InputRuntime, OutputRuntime>;
