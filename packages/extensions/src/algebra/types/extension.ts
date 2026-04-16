import type { CoreAPI } from '../../systems/core/api/api.js';

// Same API as Pi Extensions
export type Extension<TApi = CoreAPI> = (api: TApi) => void;

/**
 * Reduce a list of extensions of the same type into a single extension
 * by sequentially invoking each one.
 */
export function reduceExtensions<TApi = CoreAPI>(
	...extensions: Extension<TApi>[]
): Extension<TApi> {
	return (api) => {
		for (const ext of extensions) {
			ext(api);
		}
	};
}
