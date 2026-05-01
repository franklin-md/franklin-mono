import type { AssertNoOverlap } from '@franklin/lib';
import type { BaseAPI } from '../api/index.js';
import type {
	BaseRuntime,
	CombinedRuntime,
	RuntimeExtras,
} from '../runtime/index.js';
import { combineRuntimes } from '../runtime/index.js';
import type { Compiler } from './types.js';

export function combine<
	API1 extends BaseAPI,
	API2 extends BaseAPI & AssertNoOverlap<API1, API2>,
	R1 extends BaseRuntime,
	R2 extends BaseRuntime &
		AssertNoOverlap<RuntimeExtras<R1>, RuntimeExtras<R2>>,
>(
	c1: Compiler<API1, R1>,
	c2: Compiler<API2, R2>,
): Compiler<API1 & API2, CombinedRuntime<R1, R2>> {
	type CR = CombinedRuntime<R1, R2>;
	return {
		api: { ...c1.api, ...c2.api },
		async build(getRuntime): Promise<CR> {
			// TODO: Can we type this correctly?
			const [r1, r2] = await Promise.all([
				c1.build(getRuntime as unknown as () => R1),
				c2.build(getRuntime as unknown as () => R2),
			]);
			return combineRuntimes<R1, R2>(r1, r2);
		},
	};
}
