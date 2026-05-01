import type { API, BoundAPI } from '../api/index.js';
import type { BaseRuntime } from '../runtime/index.js';
import { reduceExtensions, type Extension } from '../types/extension.js';
import type { Compiler } from './types.js';

/**
 * Compile a single extension — create the API, register, then tie the
 * Y-combinator.
 */
export async function compile<
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	compiler: Compiler<A, Runtime>,
	extension: Extension<BoundAPI<A, Runtime>>,
): Promise<Runtime> {
	const api = compiler.createApi<Runtime>();
	extension(api);
	return tie(compiler);
}

export async function compileAll<
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	compiler: Compiler<A, Runtime>,
	extensions: Extension<BoundAPI<A, Runtime>>[],
): Promise<Runtime> {
	const extension = reduceExtensions(...extensions);
	return compile(compiler, extension);
}

async function tie<A extends API, Runtime extends BaseRuntime & A['In']>(
	compiler: Compiler<A, Runtime>,
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
