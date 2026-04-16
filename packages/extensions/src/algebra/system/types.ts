import type { Simplify } from '@franklin/lib';
import type { Compiler } from '../compiler/types.js';
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

type InferSystem<T> =
	T extends RuntimeSystem<
		infer S extends Record<string, unknown>,
		infer API,
		infer RT
	>
		? RT extends RuntimeBase<S>
			? {
					state: S;
					api: API;
					runtime: RT;
				}
			: never
		: T extends RuntimeBase<infer S>
			? {
					state: S;
					api: never;
					runtime: T;
				}
			: never;

export type InferCompiler<T> = Compiler<
	InferSystem<T>['api'],
	InferSystem<T>['runtime']
>;

export type InferState<T> = Simplify<InferSystem<T>['state']>;

export type InferAPI<T> = Simplify<InferSystem<T>['api']>;

export type InferRuntime<T> = InferSystem<T>['runtime'];

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
