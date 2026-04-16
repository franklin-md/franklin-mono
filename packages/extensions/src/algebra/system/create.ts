import { compileAll } from '../compiler/compile.js';
import type { Extension } from '../types/extension.js';
import type { RuntimeBase } from '../runtime/types.js';
import type { RuntimeSystem } from './types.js';

export async function createRuntime<
	S extends Record<string, unknown>,
	API,
	RT extends RuntimeBase<S>,
>(
	system: RuntimeSystem<S, API, RT>,
	state: S,
	extensions: Extension<API>[],
): Promise<RT> {
	const compiler = await system.createCompiler(state);
	return compileAll(compiler, extensions);
}
