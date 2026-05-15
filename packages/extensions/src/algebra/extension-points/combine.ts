import type { API, BoundAPI, ComposeAPI } from '../api/types.js';
import type { Registry } from './registry.js';
import type { ExtensionPoint } from './types.js';

export type CombineAPI<A1 extends API, A2 extends API> = ComposeAPI<A1, A2>;

// TODO: Add the same API-key overlap guard used by module composition before
// exposing this helper as a public composition surface.
export function combine<A1 extends API, A2 extends API>(
	p1: ExtensionPoint<A1>,
	p2: ExtensionPoint<A2>,
): ExtensionPoint<CombineAPI<A1, A2>> {
	type CA = CombineAPI<A1, A2>;
	return {
		createRegistry() {
			return {
				...p1.createRegistry(),
				...p2.createRegistry(),
			} as Registry<CA>;
		},
		createApi<R extends CA['In']>(registry: Registry<CA>): BoundAPI<CA, R> {
			return {
				...p1.createApi(registry as never),
				...p2.createApi(registry as never),
			} as BoundAPI<CA, R>;
		},
	};
}
