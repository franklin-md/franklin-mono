import { compileAll } from '../compiler/index.js';
import type { Extension } from '../types/index.js';
import type {
	BaseRuntimeSystem,
	InferBoundAPI,
	InferRuntime,
	InferState,
} from './types.js';

export async function createRuntime<System extends BaseRuntimeSystem>(
	system: System,
	state: InferState<System>,
	extensions: Extension<InferBoundAPI<System>>[],
): Promise<InferRuntime<System>> {
	const compiler = system.createCompiler(state);
	return compileAll(compiler, extensions);
}
