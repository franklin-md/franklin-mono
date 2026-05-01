import type { BoundAPI } from '../api/index.js';
import type { CoreAPI } from '../../systems/core/api/api.js';
import type { CoreRuntime } from '../../systems/core/runtime/index.js';

// Same API as Pi Extensions
export type Extension<TApi = BoundAPI<CoreAPI, CoreRuntime>> = (
	api: TApi,
) => void;

/**
 * Reduce a list of extensions of the same type into a single extension
 * by sequentially invoking each one.
 */
export function reduceExtensions<TApi = BoundAPI<CoreAPI, CoreRuntime>>(
	...extensions: Extension<TApi>[]
): Extension<TApi> {
	return (api) => {
		for (const ext of extensions) {
			ext(api);
		}
	};
}
