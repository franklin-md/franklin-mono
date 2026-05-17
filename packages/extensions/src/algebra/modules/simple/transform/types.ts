import type { API } from '../../../api/index.js';
import type { BaseRuntime } from '../../../runtime/index.js';
import type { ExtensionModule } from '../types.js';

export type ExtensionModuleTransform<
	A extends API,
	InputRuntime extends BaseRuntime & A['In'],
	OutputRuntime extends BaseRuntime & A['In'],
> = (
	module: ExtensionModule<A, InputRuntime>,
) => ExtensionModule<A, OutputRuntime>;
