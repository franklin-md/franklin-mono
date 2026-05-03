import { compileAll } from '../../algebra/compiler/index.js';
import type { Extension } from '../../algebra/extension/index.js';
import type { InferBoundAPI, InferRuntime, InferState } from './infer.js';
import type { BaseHarnessModule } from './module.js';

export async function createRuntime<Module extends BaseHarnessModule>(
	module: Module,
	state: InferState<Module>,
	extensions: Extension<InferBoundAPI<Module>>[],
): Promise<InferRuntime<Module>> {
	const compiler = module.createCompiler(state);
	return compileAll(compiler, extensions);
}
