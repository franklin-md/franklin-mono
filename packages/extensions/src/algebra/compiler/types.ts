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
