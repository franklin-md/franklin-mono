import type { Signature } from '../../../api/index.js';
import type { BaseRuntime } from '../../../runtime/index.js';
import type { ExtensionModule } from '../types.js';

export type ExtensionModuleTransform<
	S extends Signature,
	InputRuntime extends BaseRuntime & S['In'],
	OutputRuntime extends BaseRuntime & S['In'],
> = (
	module: ExtensionModule<S, InputRuntime>,
) => ExtensionModule<S, OutputRuntime>;
