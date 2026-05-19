import type { AssertNoOverlap } from '@franklin/lib';
import type { API, CombineSignature, Signature } from '../api/index.js';
import type { RegistryView } from '../extension-points/view.js';
import type {
	BaseRuntime,
	CombinedRuntime,
	RuntimeExtras,
} from '../runtime/index.js';
import { combineRuntimes } from '../runtime/index.js';
import type { Compiler } from './types.js';

export function combine<
	S1 extends Signature,
	S2 extends Signature,
	R1 extends BaseRuntime & S1['In'],
	R2 extends BaseRuntime &
		S2['In'] &
		AssertNoOverlap<RuntimeExtras<R1>, RuntimeExtras<R2>>,
>(
	c1: Compiler<S1, R1>,
	c2: Compiler<S2, R2> &
		AssertNoOverlap<
			API<S1, CombinedRuntime<R1, R2>>,
			API<S2, CombinedRuntime<R1, R2>>
		>,
): Compiler<CombineSignature<S1, S2>, CombinedRuntime<R1, R2>> {
	type CR = CombinedRuntime<R1, R2>;
	type CS = CombineSignature<S1, S2>;

	return {
		compile: async <ContextRuntime extends BaseRuntime & CS['In']>(
			registry: RegistryView<CS, ContextRuntime>,
			getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
		): Promise<CR> => {
			const [r1, r2] = await Promise.all([
				c1.compile<ContextRuntime>(registry, getRuntime),
				c2.compile<ContextRuntime>(registry, getRuntime),
			]);
			return combineRuntimes<R1, R2>(r1, r2);
		},
	};
}
