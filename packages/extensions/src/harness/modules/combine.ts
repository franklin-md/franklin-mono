import { combine as combineCompilers } from '../../algebra/compiler/combine.js';
import type { StateHandle } from '../../algebra/runtime/index.js';
import type {
	BaseHarnessModule,
	CombinableModule,
	CombineModules,
	InferCompiler,
	InferRuntime,
	InferState,
} from './types.js';

/**
 * Combine two `HarnessModule`s by merging their empty states, delegating
 * compiler composition to the compiler-level `combine`, and composing
 * the per-module `state(runtime)` projections by spreading their results.
 */
export function combine<
	RTS1 extends BaseHarnessModule,
	RTS2 extends BaseHarnessModule,
>(
	module1: RTS1,
	module2: RTS2 & CombinableModule<RTS1, RTS2>,
): CombineModules<RTS1, RTS2> {
	type S = InferState<RTS1> & InferState<RTS2>;
	type RT = InferRuntime<CombineModules<RTS1, RTS2>>;

	return {
		emptyState() {
			return {
				...module1.emptyState(),
				...module2.emptyState(),
			} as never;
		},

		createCompiler(input) {
			const c1 = module1.createCompiler({
				...input,
				state: input.state as InferState<RTS1>,
			}) as InferCompiler<RTS1>;
			const c2 = module2.createCompiler({
				...input,
				state: input.state as InferState<RTS2>,
			}) as InferCompiler<RTS2>;
			return combineCompilers(c1, c2 as never) as never;
		},

		state(runtime: RT): StateHandle<S> {
			const h1 = module1.state(runtime as never) as StateHandle<
				InferState<RTS1>
			>;
			const h2 = module2.state(runtime as never) as StateHandle<
				InferState<RTS2>
			>;
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
