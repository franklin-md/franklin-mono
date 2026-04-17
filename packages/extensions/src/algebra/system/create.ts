import type { BaseAPI } from '../api/index.js';
import { compileAll } from '../compiler/index.js';
import type { BaseRuntime } from '../runtime/index.js';
import type { BaseState } from '../state/index.js';
import type { Extension } from '../types/index.js';
import type { RuntimeSystem } from './types.js';

export async function createRuntime<
	S extends BaseState,
	API extends BaseAPI,
	RT extends BaseRuntime<S>,
>(
	system: RuntimeSystem<S, API, RT>,
	state: S,
	extensions: Extension<API>[],
): Promise<RT> {
	const compiler = await system.createCompiler(state);
	return compileAll(compiler, extensions);
}
