import { combine as combineCompilers } from '../compiler/combine.js';
import type { StateHandle } from '../runtime/index.js';
import type {
	BaseRuntimeSystem,
	CombinableSystem,
	CombineSystems,
	InferCompiler,
	InferRuntime,
	InferState,
} from './types.js';

/**
 * Combine two `RuntimeSystem`s by merging their empty states, delegating
 * compiler composition to the compiler-level `combine`, and composing
 * the per-system `state(runtime)` projections by spreading their results.
 */
export function combine<
	RTS1 extends BaseRuntimeSystem,
	RTS2 extends BaseRuntimeSystem,
>(
	sys1: RTS1,
	sys2: RTS2 & CombinableSystem<RTS1, RTS2>,
): CombineSystems<RTS1, RTS2> {
	type S = InferState<RTS1> & InferState<RTS2>;
	type RT = InferRuntime<CombineSystems<RTS1, RTS2>>;

	return {
		emptyState() {
			return {
				...sys1.emptyState(),
				...sys2.emptyState(),
			} as never;
		},

		createCompiler(state) {
			const c1 = sys1.createCompiler(state) as InferCompiler<RTS1>;
			const c2 = sys2.createCompiler(state) as InferCompiler<RTS2>;
			return combineCompilers(c1, c2 as never) as never;
		},

		state(runtime: RT): StateHandle<S> {
			const h1 = sys1.state(runtime as never) as StateHandle<InferState<RTS1>>;
			const h2 = sys2.state(runtime as never) as StateHandle<InferState<RTS2>>;
			return {
				get: async () =>
					({
						...(await h1.get()),
						...(await h2.get()),
					}) as S,
				fork: async () =>
					({
						...(await h1.fork()),
						...(await h2.fork()),
					}) as S,
				child: async () =>
					({
						...(await h1.child()),
						...(await h2.child()),
					}) as S,
			};
		},
	};
}
