import type { API } from '../../../api/index.js';
import type { CompilerTransform } from '../../../compiler/index.js';
import type { BaseRuntime } from '../../../runtime/index.js';
import type { ExtensionModuleTransform } from './types.js';

export function liftCompilerTransform<
	A extends API,
	InputRuntime extends BaseRuntime & A['In'],
	OutputRuntime extends BaseRuntime & A['In'],
>(
	transform: CompilerTransform<A, InputRuntime, OutputRuntime>,
): ExtensionModuleTransform<A, InputRuntime, OutputRuntime> {
	return (module) => {
		return {
			extensionPoint: module.extensionPoint,
			compiler: transform(module.compiler),
		};
	};
}
