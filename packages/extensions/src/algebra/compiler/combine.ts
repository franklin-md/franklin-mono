import type { AssertNoOverlap } from '@franklin/lib';
import type { API, BoundAPI, ComposeAPI } from '../api/index.js';
import type {
	BaseRuntime,
	CombinedRuntime,
	RuntimeExtras,
} from '../runtime/index.js';
import { combineRuntimes } from '../runtime/index.js';
import type { Compiler } from './types.js';

export function combine<
	A1 extends API,
	A2 extends API,
	R1 extends BaseRuntime & A1['In'],
	R2 extends BaseRuntime &
		A2['In'] &
		AssertNoOverlap<RuntimeExtras<R1>, RuntimeExtras<R2>>,
>(
	c1: Compiler<A1, R1>,
	c2: Compiler<A2, R2> &
		AssertNoOverlap<
			BoundAPI<A1, CombinedRuntime<R1, R2>>,
			BoundAPI<A2, CombinedRuntime<R1, R2>>
		>,
): Compiler<ComposeAPI<A1, A2>, CombinedRuntime<R1, R2>> {
	type CR = CombinedRuntime<R1, R2>;
	type RegisterFor<A extends API> = <ContextRuntime extends CR>(
		use: (api: BoundAPI<A, ContextRuntime>) => void,
	) => void;

	const register1 = c1.register as RegisterFor<A1>;
	const register2 = c2.register as RegisterFor<A2>;

	return {
		register: <ContextRuntime extends CR>(
			use: (api: BoundAPI<ComposeAPI<A1, A2>, ContextRuntime>) => void,
		) => {
			register1<ContextRuntime>((api1) => {
				register2<ContextRuntime>((api2) => {
					use({
						...api1,
						...api2,
					} as BoundAPI<ComposeAPI<A1, A2>, ContextRuntime>);
				});
			});
		},
		build: async (getRuntime): Promise<CR> => {
			const [r1, r2] = await Promise.all([
				c1.build(getRuntime as unknown as () => R1),
				c2.build(getRuntime as unknown as () => R2),
			]);
			return combineRuntimes<R1, R2>(r1, r2);
		},
	};
}
