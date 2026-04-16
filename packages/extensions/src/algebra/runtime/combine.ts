import type { Simplify } from '@franklin/lib';
import type { RuntimeBase } from './types.js';

export type MergedRuntime<
	S1,
	S2,
	RT1 extends RuntimeBase<S1>,
	RT2 extends RuntimeBase<S2>,
> = Simplify<
	RuntimeBase<S1 & S2> &
		Omit<RT1, keyof RuntimeBase<S1>> &
		Omit<RT2, keyof RuntimeBase<S2>>
>;

export function mergeRuntimes<
	S1,
	RT1 extends RuntimeBase<S1>,
	S2,
	RT2 extends RuntimeBase<S2>,
>(rt1: RT1, rt2: RT2): MergedRuntime<S1, S2, RT1, RT2> {
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
