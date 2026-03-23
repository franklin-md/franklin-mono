import type { Extension } from '../types/extension.js';

// TODO: It is possible to express a compiler just as (extension: Extension<TApi>) => Promise<TResult>;
// Makes it clearer than if they were single use.
// TODO: I think the solution is to define CollectCompiler class that is this 'build collecting api then use to build result' pattern. And we can translate to the pure type later

/**
 * A compiler instance. Created fresh for each compilation.
 *
 * - api:   the registration surface (collectors). Extensions call methods
 *          on this to register handlers, tools, stores, etc.
 * - build: reads collected state and produces the result.
 *
 * Compilers compose via `combine(c1, c2)` which merges APIs and results.
 */
export type Compiler<TApi, TResult> = {
	readonly api: TApi;
	build(): Promise<TResult>;
};

/**
 * Compile an extension using a compiler instance.
 * Calls the extension with the compiler's API, then builds the result.
 */
export async function compile<TApi, TResult>(
	compiler: Compiler<TApi, TResult>,
	extension: Extension<TApi>,
): Promise<TResult> {
	extension(compiler.api);
	return compiler.build();
}

/**
 * Combine two compilers into one whose API is A1 & A2
 * and whose result is R1 & R2.
 *
 * Each compiler collects independently; the extension sees the merged API.
 */
export function combine<A1, R1, A2, R2>(
	c1: Compiler<A1, R1>,
	c2: Compiler<A2, R2>,
): Compiler<A1 & A2, R1 & R2> {
	return {
		api: { ...c1.api, ...c2.api },
		async build() {
			const [r1, r2] = await Promise.all([c1.build(), c2.build()]);
			return { ...r1, ...r2 } as R1 & R2;
		},
	};
}
