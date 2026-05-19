import type { Extension } from './types.js';

/**
 * Reduce a list of extensions of the same type into a single extension
 * by sequentially invoking each one.
 */
export function reduceExtensions<TApi>(
	...extensions: Extension<TApi>[]
): Extension<TApi> {
	return (api) => {
		for (const ext of extensions) {
			ext(api);
		}
	};
}
