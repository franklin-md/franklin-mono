import type { AssertNoOverlap, Simplify } from '@franklin/lib';
import type { BaseRuntime } from './types.js';

export type RuntimeExtras<RT extends BaseRuntime> = Omit<RT, keyof BaseRuntime>;

/**
 * Runtime produced by `combineRuntimes`. Recomposes the lifecycle members of
 * `BaseRuntime` and merges the extra surface areas of both runtimes.
 * Overlap between the extras is prevented at composition sites (via the
 * guards on `combine()` / `combineRuntimes()`), not in this type.
 */
export type CombinedRuntime<
	RT1 extends BaseRuntime,
	RT2 extends BaseRuntime,
> = Simplify<BaseRuntime & RuntimeExtras<RT1> & RuntimeExtras<RT2>>;

export function combineRuntimes<
	RT1 extends BaseRuntime,
	RT2 extends BaseRuntime,
>(
	rt1: RT1,
	rt2: RT2 & AssertNoOverlap<RuntimeExtras<RT1>, RuntimeExtras<RT2>>,
): CombinedRuntime<RT1, RT2> {
	return {
		...rt1,
		...rt2,
		dispose: () => Promise.all([rt1.dispose(), rt2.dispose()]).then(() => {}),
		subscribe: (listener: () => void) => {
			const unsub1 = rt1.subscribe(listener);
			const unsub2 = rt2.subscribe(listener);
			return () => {
				unsub1();
				unsub2();
			};
		},
	};
}
