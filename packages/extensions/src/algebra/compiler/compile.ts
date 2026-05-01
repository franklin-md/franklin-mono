import type { Extension } from '../types/extension.js';
import type { Compiler } from './types.js';

/**
 * Compile a single extension — register, then tie the Y-combinator.
 */
export async function compile<API, Runtime>(
	compiler: Compiler<API, Runtime>,
	extension: Extension<API>,
): Promise<Runtime> {
	extension(compiler.api);
	return tie(compiler);
}

export async function compileAll<API, Runtime>(
	compiler: Compiler<API, Runtime>,
	extensions: Extension<API>[],
): Promise<Runtime> {
	for (const ext of extensions) ext(compiler.api);
	return tie(compiler);
}

async function tie<API, Runtime>(
	compiler: Compiler<API, Runtime>,
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
	cell.value = await compiler.build(getRuntime);
	return cell.value;
}
