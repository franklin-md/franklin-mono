import type { AssertNoOverlap } from '@franklin/lib';
import type { BaseAPI } from '../api/index.js';
import type { Compiler } from './types.js';

/**
 * Combine two compilers into one whose API is A1 & A2
 * and whose result is R1 & R2.
 *
 * Each compiler collects independently; the extension sees the merged API.
 */
export function combine<A1 extends BaseAPI, R1, A2 extends BaseAPI, R2>(
	c1: Compiler<A1, R1>,
	c2: Compiler<A2, R2> & AssertNoOverlap<A1, A2>,
): Compiler<A1 & A2, R1 & R2> {
	return {
		api: { ...c1.api, ...c2.api },
		async build() {
			const [r1, r2] = await Promise.all([c1.build(), c2.build()]);
			return { ...r1, ...r2 } as R1 & R2;
		},
	};
}
