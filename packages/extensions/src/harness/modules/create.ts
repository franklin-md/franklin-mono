import { compileAll } from '../../algebra/compiler/index.js';
import type { Extension } from '../../algebra/extension/index.js';
import {
	createHarnessModuleCompilerInput,
	type HarnessModuleCompilerContext,
} from './context.js';
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
	context?: Partial<HarnessModuleCompilerContext>,
): Promise<InferRuntime<Module>> {
	const compiler = module.createCompiler(
		createHarnessModuleCompilerInput(state, context),
	);
	return compileAll(compiler, extensions);
}
