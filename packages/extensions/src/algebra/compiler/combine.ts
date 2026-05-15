import type { AssertNoOverlap } from '@franklin/lib';
import type { API, BoundAPI, ComposeAPI } from '../api/index.js';
import type { Registry } from '../extension-points/registry.js';
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
	type CA = ComposeAPI<A1, A2>;

	return {
		compile: async <ContextRuntime extends BaseRuntime & CA['In']>(
			registry: Registry<CA, ContextRuntime>,
			getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
		): Promise<CR> => {
			const [r1, r2] = await Promise.all([
				c1.compile<ContextRuntime>(
					registry as unknown as Registry<A1, ContextRuntime>,
					getRuntime,
				),
				c2.compile<ContextRuntime>(
					registry as unknown as Registry<A2, ContextRuntime>,
					getRuntime,
				),
			]);
			return combineRuntimes<R1, R2>(r1, r2);
		},
	};
}
