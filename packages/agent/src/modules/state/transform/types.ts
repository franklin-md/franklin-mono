import type { Signature } from '@franklin/extensibility';
import type { CompilerTransform } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { ExtensionModuleTransform } from '@franklin/extensibility/module';
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
