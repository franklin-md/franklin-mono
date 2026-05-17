import type { Signature } from '../../../api/index.js';
import type { CompilerTransform } from '../../../compiler/transform/types.js';
import type { BaseRuntime } from '../../../runtime/index.js';
import type { ExtensionModuleTransform } from '../../simple/transform/types.js';
import type { BaseState, StateExtensionModule } from '../types.js';

export type StateCompilerTransform<
	S extends BaseState,
	Api extends Signature,
	InputRuntime extends BaseRuntime & Api['In'],
	OutputRuntime extends InputRuntime,
> = (state: S) => CompilerTransform<Api, InputRuntime, OutputRuntime>;

export type StateExtensionModuleTransform<
	S extends BaseState,
	Api extends Signature,
	InputRuntime extends BaseRuntime & Api['In'],
	OutputRuntime extends InputRuntime,
> = (
	module: StateExtensionModule<S, Api, InputRuntime>,
) => StateExtensionModule<S, Api, OutputRuntime>;

export type StateModuleTransform<
	S extends BaseState,
	Api extends Signature,
	InputRuntime extends BaseRuntime & Api['In'],
	OutputRuntime extends InputRuntime,
> = (state: S) => ExtensionModuleTransform<Api, InputRuntime, OutputRuntime>;
