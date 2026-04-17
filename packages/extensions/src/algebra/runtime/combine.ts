import type { Simplify } from '@franklin/lib';
import type { BaseRuntime } from './types.js';

type RuntimeExtras<S, RT extends BaseRuntime<S>> = Omit<
	RT,
	keyof BaseRuntime<S>
>;

/**
 * Runtime produced by `combineRuntimes`. Recomposes the lifecycle members
 * of `BaseRuntime<S1 & S2>` and merges the extra surface areas of both
 * runtimes. Overlap between the extras is prevented at composition sites
 * (via the API-level overlap guard on `combine()`), not in this type.
 */
export type CombinedRuntime<
	S1,
	S2,
	RT1 extends BaseRuntime<S1>,
	RT2 extends BaseRuntime<S2>,
> = Simplify<
	BaseRuntime<S1 & S2> & RuntimeExtras<S1, RT1> & RuntimeExtras<S2, RT2>
>;

export function combineRuntimes<
	S1,
	RT1 extends BaseRuntime<S1>,
	S2,
	RT2 extends BaseRuntime<S2>,
>(rt1: RT1, rt2: RT2): CombinedRuntime<S1, S2, RT1, RT2> {
	return {
		...rt1,
		...rt2,
		state: async () => ({ ...(await rt1.state()), ...(await rt2.state()) }),
		fork: async () => ({ ...(await rt1.fork()), ...(await rt2.fork()) }),
		child: async () => ({ ...(await rt1.child()), ...(await rt2.child()) }),
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
