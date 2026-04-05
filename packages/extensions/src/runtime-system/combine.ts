import type { Compiler } from '../compile/types.js';
import { mergeRuntimes, type MergedRuntime } from '../runtime/combine.js';
import type { RuntimeBase } from '../runtime/types.js';
import type { RuntimeSystem } from './types.js';

export function combine<
	S1 extends Record<string, unknown>,
	A1,
	RT1 extends RuntimeBase<S1>,
	S2 extends Record<string, unknown>,
	A2,
	RT2 extends RuntimeBase<S2>,
>(
	sys1: RuntimeSystem<S1, A1, RT1>,
	sys2: RuntimeSystem<S2, A2, RT2>,
): RuntimeSystem<S1 & S2, A1 & A2, MergedRuntime<S1, S2, RT1, RT2>> {
	type CS = S1 & S2;
	type CA = A1 & A2;
	type CR = MergedRuntime<S1, S2, RT1, RT2>;

	return {
		emptyState(): CS {
			return { ...sys1.emptyState(), ...sys2.emptyState() } as CS;
		},

		async createCompiler(state: CS): Promise<Compiler<CA, CR>> {
			const [c1, c2] = await Promise.all([
				sys1.createCompiler(state as S1),
				sys2.createCompiler(state as S2),
			]);

			return {
				api: { ...c1.api, ...c2.api } as CA,
				async build(): Promise<CR> {
					const [rt1, rt2] = await Promise.all([c1.build(), c2.build()]);
					return mergeRuntimes(rt1, rt2) as unknown as CR;
				},
			};
		},
	};
}
