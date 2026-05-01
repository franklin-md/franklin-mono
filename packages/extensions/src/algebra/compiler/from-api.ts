import type { API, BoundAPI } from '../api/index.js';
import type { BaseRuntime } from '../runtime/index.js';
import type { Compiler } from './types.js';

export function compilerFromApi<
	A extends API,
	Runtime extends BaseRuntime & A['In'],
>(
	api: BoundAPI<A, Runtime>,
	build: Compiler<A, Runtime>['build'],
): Compiler<A, Runtime> {
	return {
		createApi: () => api as never,
		build,
	};
}
