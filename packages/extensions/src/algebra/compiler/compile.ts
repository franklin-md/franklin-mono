import type { Extension } from '../types/extension.js';
import type { Compiler } from './types.js';

/**
 * Compile an extension using a compiler instance.
 * Calls the extension with the compiler's API, then builds the result.
 */
export async function compile<TApi, TResult>(
	compiler: Compiler<TApi, TResult>,
	extension: Extension<TApi>,
): Promise<TResult> {
	extension(compiler.api);
	return compiler.build();
}

/**
 * Compile N extensions into a single compiler, then build the result.
 *
 * All extensions register into the same compiler instance — handlers,
 * tools, and stores accumulate in registration order.
 */
export async function compileAll<TApi, TResult>(
	compiler: Compiler<TApi, TResult>,
	extensions: Extension<TApi>[],
): Promise<TResult> {
	for (const ext of extensions) ext(compiler.api);
	return compiler.build();
}
