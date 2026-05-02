import { compileAll } from '../../algebra/compiler/index.js';
import type { Extension } from '../../algebra/extension/index.js';
import { createHarnessModuleCompilerInput } from './context.js';
import type {
	BaseHarnessModule,
	InferBoundAPI,
	InferRuntime,
	InferState,
} from './types.js';

export async function createRuntime<Module extends BaseHarnessModule>(
	module: Module,
	state: InferState<Module>,
	extensions: Extension<InferBoundAPI<Module>>[],
	options?: { readonly id?: string },
): Promise<InferRuntime<Module>> {
	const compiler = module.createCompiler(
		createHarnessModuleCompilerInput(state, options),
	);
	return compileAll(compiler, extensions);
}
