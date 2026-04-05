import type { Compiler } from '../compile/types.js';
import type { RuntimeBase } from '../runtime/types.js';
import type { MergedRuntime } from '../runtime/combine.js';

export type RuntimeSystem<
	S extends Record<string, unknown>,
	API,
	RT extends RuntimeBase<S>,
> = {
	emptyState(): S;
	createCompiler(state: S): Promise<Compiler<API, RT>>;
};

// ---------------------------------------------------------------------------
// Inference helpers — extract type parameters from a RuntimeSystem or Runtime
// ---------------------------------------------------------------------------

export type InferState<T> =
	T extends RuntimeSystem<infer S, any, any>
		? S
		: T extends RuntimeBase<infer S>
			? S
			: never;

export type InferAPI<T> =
	T extends RuntimeSystem<any, infer A, any> ? A : never;

export type InferRuntime<T> =
	T extends RuntimeSystem<any, any, infer RT> ? RT : never;

// ---------------------------------------------------------------------------
// Type-level combine — mirrors the value-level `combine` function
// ---------------------------------------------------------------------------

export type CombineSystems<
	Sys1 extends RuntimeSystem<any, any, any>,
	Sys2 extends RuntimeSystem<any, any, any>,
> = RuntimeSystem<
	InferState<Sys1> & InferState<Sys2>,
	InferAPI<Sys1> & InferAPI<Sys2>,
	MergedRuntime<
		InferState<Sys1>,
		InferState<Sys2>,
		InferRuntime<Sys1>,
		InferRuntime<Sys2>
	>
>;
