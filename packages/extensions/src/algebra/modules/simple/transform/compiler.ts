import type { Signature } from '../../../api/index.js';
import type { CompilerTransform } from '../../../compiler/index.js';
import type { BaseRuntime } from '../../../runtime/index.js';
import type { ExtensionModuleTransform } from './types.js';

export function liftCompilerTransform<
	S extends Signature,
	InputRuntime extends BaseRuntime & S['In'],
	OutputRuntime extends BaseRuntime & S['In'],
>(
	transform: CompilerTransform<S, InputRuntime, OutputRuntime>,
): ExtensionModuleTransform<S, InputRuntime, OutputRuntime> {
	return (module) => {
		return {
			extensionPoint: module.extensionPoint,
			compiler: transform(module.compiler),
		};
	};
}
