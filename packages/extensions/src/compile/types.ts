import type { Extension } from '../types/extension.js';

/**
 * A compiler instance.
 *
 * - api:   the registration surface (collectors). Extensions call methods
 *          on this to register handlers, tools, stores, etc.
 * - build: reads collected state and produces the result.
 *
 * Compilers compose via `combine(c1, c2)` which merges APIs and results.
 * Multiple extensions register into a single compiler via `compileAll`.
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
 * Compile N extensions into a single compiler, then build the result.
 *
 * All extensions register into the same compiler instance — handlers,
 * tools, and stores accumulate in registration order.
 */
export async function compileAll<TApi, TResult>(
	compiler: Compiler<TApi, TResult>,
	extensions: Extension<TApi>[],
): Promise<TResult> {
	for (const ext of extensions) ext(compiler.api);
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

// ---------------------------------------------------------------------------
// CompilerBuilder — typed builder for heterogeneous compiler composition
// ---------------------------------------------------------------------------

export interface CompilerBuilder<A, R> {
	add<A2, R2>(c: Compiler<A2, R2>): CompilerBuilder<A & A2, R & R2>;
	done(): Compiler<A, R>;
}

export function compilers<A, R>(c: Compiler<A, R>): CompilerBuilder<A, R> {
	return {
		add: <A2, R2>(c2: Compiler<A2, R2>) => compilers(combine(c, c2)),
		done: () => c,
	};
}
