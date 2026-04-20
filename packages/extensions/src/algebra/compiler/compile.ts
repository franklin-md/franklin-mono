import type { Extension } from '../types/extension.js';
import type { Compiler } from './types.js';

/**
 * Compile a single extension — register, then tie the Y-combinator.
 */
export async function compile<API, S, Runtime>(
	compiler: Compiler<API, S, Runtime>,
	extension: Extension<API>,
	state: S,
): Promise<Runtime> {
	extension(compiler.api);
	return tie(compiler, state);
}

export async function compileAll<API, S, Runtime>(
	compiler: Compiler<API, S, Runtime>,
	extensions: Extension<API>[],
	state: S,
): Promise<Runtime> {
	for (const ext of extensions) ext(compiler.api);
	return tie(compiler, state);
}

async function tie<API, S, Runtime>(
	compiler: Compiler<API, S, Runtime>,
	state: S,
): Promise<Runtime> {
	// Mutable cell — handler closures capture `getRuntime` at registration,
	// `compileAll`/`compile` populates `cell.value` once `build` resolves.
	const cell: { value?: Runtime } = {};
	const getRuntime = (): Runtime => {
		if (cell.value === undefined) {
			throw new Error(
				'getRuntime() called before build returned — handlers must only read runtime at invocation time, not during build',
			);
		}
		return cell.value;
	};
	cell.value = await compiler.build(state, getRuntime);
	return cell.value;
}
