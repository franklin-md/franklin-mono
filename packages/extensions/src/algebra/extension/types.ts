import type { AssertNoOverlap, Simplify } from '@franklin/lib';
import type { API, Signature } from '../api/index.js';
import type { BaseRuntime, ReduceRuntimes } from '../runtime/index.js';

// `TApi` defaults to `any` so a heterogeneous bundle can store extensions
// keyed to different APIs/runtimes. The function-argument position is
// contravariant, so `unknown` would force every bundle slot to a single shape.
export type Extension<TAPI = any> = (api: TAPI) => void;

type AssertSignatureListNoOverlap<
	Signatures extends readonly Signature[],
	Runtime extends BaseRuntime,
	Accumulated extends object = Record<never, never>,
> = Signatures extends readonly [
	infer Head extends Signature,
	...infer Tail extends readonly Signature[],
]
	? Runtime extends Head['In']
		? AssertNoOverlap<Accumulated, API<Head, Runtime>> extends never
			? never
			: AssertSignatureListNoOverlap<
					Tail,
					Runtime,
					Accumulated & API<Head, Runtime>
				>
		: never
	: unknown;

type ValidateExtensionTuples<
	Signatures extends readonly Signature[],
	Runtimes extends readonly BaseRuntime[],
> = [ReduceRuntimes<Runtimes>] extends [never]
	? never
	: ReduceRuntimes<Runtimes> extends infer Runtime extends BaseRuntime
		? AssertSignatureListNoOverlap<Signatures, Runtime> extends never
			? never
			: unknown
		: never;

type BindReducedAPI<
	Signatures extends readonly Signature[],
	Runtime extends BaseRuntime,
> = Simplify<BindAPISurfaces<Signatures, Runtime>>;

type BindAPISurfaces<
	Signatures extends readonly Signature[],
	Runtime extends BaseRuntime,
> = Signatures extends readonly []
	? Record<never, never>
	: Signatures extends readonly [
				infer Head extends Signature,
				...infer Tail extends readonly Signature[],
		  ]
		? Runtime extends Head['In']
			? API<Head, Runtime> & BindAPISurfaces<Tail, Runtime>
			: never
		: Record<never, never>;

export type ExtensionAPI<
	Signatures extends readonly Signature[],
	Runtimes extends readonly BaseRuntime[],
> = [ReduceRuntimes<Runtimes>] extends [never]
	? never
	: ReduceRuntimes<Runtimes> extends infer Runtime extends BaseRuntime
		? AssertSignatureListNoOverlap<Signatures, Runtime> extends never
			? never
			: BindReducedAPI<Signatures, Runtime>
		: never;

export type ExtensionFor<
	Signatures extends readonly Signature[],
	Runtimes extends readonly BaseRuntime[],
> = Extension<ExtensionAPI<Signatures, Runtimes>>;

export type ExtensionInput<
	Signatures extends readonly Signature[],
	Runtimes extends readonly BaseRuntime[],
> = ExtensionFor<Signatures, Runtimes> &
	ValidateExtensionTuples<Signatures, Runtimes>;
