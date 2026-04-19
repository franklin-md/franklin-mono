import { combine as combineCompilers } from '../compiler/combine.js';
import type {
	BaseRuntimeSystem,
	CombinableSystem,
	CombineSystems,
	InferCompiler,
} from './types.js';

/**
 * Combine two `RuntimeSystem`s by merging their empty states and delegating
 * compiler composition to the compiler-level `combine`.
 */
export function combine<
	RTS1 extends BaseRuntimeSystem,
	RTS2 extends BaseRuntimeSystem & CombinableSystem<RTS1, RTS2>,
>(sys1: RTS1, sys2: RTS2): CombineSystems<RTS1, RTS2> {
	return {
		emptyState() {
			return {
				...sys1.emptyState(),
				...sys2.emptyState(),
			} as never;
		},

		createCompiler() {
			const c1 = sys1.createCompiler() as InferCompiler<RTS1>;
			const c2 = sys2.createCompiler() as InferCompiler<RTS2>;
			return combineCompilers(c1, c2);
		},
	};
}
