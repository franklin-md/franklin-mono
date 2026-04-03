import type { Compiler } from '../compile/types.js';
import { compileAll } from '../compile/types.js';
import type { Extension } from '../types/extension.js';
import type { RuntimeBase } from '../runtime/types.js';

export type RuntimeSystem<
	S extends Record<string, unknown>,
	API,
	RT extends RuntimeBase<S>,
> = {
	emptyState(): S;
	createCompiler(state: S): Promise<Compiler<API, RT>>;
};

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
