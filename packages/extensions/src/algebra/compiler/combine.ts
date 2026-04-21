import type { AssertNoOverlap } from '@franklin/lib';
import type { BaseAPI } from '../api/index.js';
import type {
	BaseRuntime,
	CombinedRuntime,
	RuntimeExtras,
} from '../runtime/index.js';
import { combineRuntimes } from '../runtime/index.js';
import type { Compiler } from './types.js';
import type { BaseState } from '../state/types.js';

export function combine<
	API1 extends BaseAPI,
	API2 extends BaseAPI & AssertNoOverlap<API1, API2>,
	S1 extends BaseState,
	S2 extends BaseState & AssertNoOverlap<S1, S2>,
	R1 extends BaseRuntime<S1>,
	R2 extends BaseRuntime<S2> &
		AssertNoOverlap<RuntimeExtras<S1, R1>, RuntimeExtras<S2, R2>>,
>(
	c1: Compiler<API1, S1, R1>,
	c2: Compiler<API2, S2, R2>,
): Compiler<API1 & API2, S1 & S2, CombinedRuntime<S1, S2, R1, R2>> {
	type CR = CombinedRuntime<S1, S2, R1, R2>;
	return {
		api: { ...c1.api, ...c2.api },
		async build(state, getRuntime): Promise<CR> {
			// TODO: Can we type this correctly?
			const [r1, r2] = await Promise.all([
				c1.build(state, getRuntime as unknown as () => R1),
				c2.build(state, getRuntime as unknown as () => R2),
			]);
			return combineRuntimes<S1, R1, S2, R2>(r1, r2);
		},
	};
}
