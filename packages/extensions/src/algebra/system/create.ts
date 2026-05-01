import type { BaseAPI } from '../api/index.js';
import { compileAll } from '../compiler/index.js';
import type { BaseRuntime } from '../runtime/index.js';
import type { BaseState } from '../state/index.js';
import type { Extension } from '../types/index.js';
import type { RuntimeSystem } from './types.js';

export async function createRuntime<
	S extends BaseState,
	API extends BaseAPI,
	Self extends BaseRuntime,
>(
	system: RuntimeSystem<S, API, Self>,
	state: S,
	extensions: Extension<API>[],
): Promise<Self> {
	const compiler = system.createCompiler(state);
	return compileAll(compiler, extensions);
}
