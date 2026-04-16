import type { Compiler } from '../compiler/types.js';
import { mergeRuntimes } from '../runtime/combine.js';
import type {
	CombineSystems,
	InferAPI,
	InferCompiler,
	InferRuntime,
	InferState,
	RuntimeSystem,
} from './types.js';

export function combine<
	RTS1 extends RuntimeSystem<any, any, any>,
	RTS2 extends RuntimeSystem<any, any, any>,
>(sys1: RTS1, sys2: RTS2): CombineSystems<RTS1, RTS2> {
	type CS = InferState<CombineSystems<RTS1, RTS2>>;
	type CA = InferAPI<CombineSystems<RTS1, RTS2>>;
	type CR = InferRuntime<CombineSystems<RTS1, RTS2>>;
	return {
		emptyState(): CS {
			return {
				...sys1.emptyState(),
				...sys2.emptyState(),
			};
		},

		async createCompiler(state: CS): Promise<Compiler<CA, CR>> {
			const [c1, c2] = await Promise.all([
				sys1.createCompiler(state) as Promise<InferCompiler<RTS1>>,
				sys2.createCompiler(state) as Promise<InferCompiler<RTS2>>,
			]);

			return {
				api: { ...c1.api, ...c2.api } as CA,
				async build(): Promise<CR> {
					const [rt1, rt2] = await Promise.all([c1.build(), c2.build()]);
					return mergeRuntimes(rt1, rt2) as CR;
				},
			};
		},
	};
}
