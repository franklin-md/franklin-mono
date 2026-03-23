import type { Extension } from '../types/extension.js';

/**
 * A compiler instance. Created fresh for each compilation.
 *
 * - api:   the registration surface (collectors). Extensions call methods
 *          on this to register handlers, tools, stores, etc.
 * - build: reads collected state and produces the result.
 * - merge: combines two results into one (monoid operation on TResult).
 *
 * Compilers compose via `combine(c1, c2)` which merges APIs and results.
 * Multiple extensions compile via `compileAll(create, exts)` which folds
 * with `merge`.
 */
export type Compiler<TApi, TResult> = {
	readonly api: TApi;
	build(): Promise<TResult>;
	merge(a: TResult, b: TResult): TResult;
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
 * Compile N extensions, each with a fresh compiler, then fold results
 * using the compiler's merge operation.
 *
 * For 0 extensions, returns the empty result (build on a fresh compiler).
 */
export async function compileAll<TApi, TResult>(
	compiler: Compiler<TApi, TResult>,
	extensions: Extension<TApi>[],
): Promise<TResult> {
	if (extensions.length === 0) {
		return compiler.build();
	}

	const results = (await Promise.all(
		extensions.map((ext) => compile(compiler, ext)),
	)) as TResult[];

	return results.reduce((a, b) => compiler.merge(a, b));
}

/**
 * Combine two compilers into one whose API is A1 & A2
 * and whose result is R1 & R2.
 *
 * Each compiler collects independently; the extension sees the merged API.
 * The combined merge delegates to each constituent's merge.
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
		merge(a: R1 & R2, b: R1 & R2) {
			return {
				...c1.merge(a, b),
				...c2.merge(a, b),
			};
		},
	};
}
