import type { AssertNoOverlap, Simplify } from '@franklin/lib';
import type { API, BoundAPI } from '../api/index.js';
import type { BaseRuntime, ReduceRuntimes } from '../runtime/index.js';

// `TApi` defaults to `any` so a heterogeneous bundle can store extensions
// keyed to different APIs/runtimes. The function-argument position is
// contravariant, so `unknown` would force every bundle slot to a single shape.
export type Extension<TApi = any> = (api: TApi) => void;

type AssertAPIListNoOverlap<
	APIs extends readonly API[],
	Runtime extends BaseRuntime,
	Accumulated extends object = Record<never, never>,
> = APIs extends readonly [
	infer Head extends API,
	...infer Tail extends readonly API[],
]
	? Runtime extends Head['In']
		? AssertNoOverlap<Accumulated, BoundAPI<Head, Runtime>> extends never
			? never
			: AssertAPIListNoOverlap<
					Tail,
					Runtime,
					Accumulated & BoundAPI<Head, Runtime>
				>
		: never
	: unknown;

type ValidateExtensionTuples<
	APIs extends readonly API[],
	Runtimes extends readonly BaseRuntime[],
> = [ReduceRuntimes<Runtimes>] extends [never]
	? never
	: ReduceRuntimes<Runtimes> extends infer Runtime extends BaseRuntime
		? AssertAPIListNoOverlap<APIs, Runtime> extends never
			? never
			: unknown
		: never;

type BindReducedAPI<
	APIs extends readonly API[],
	Runtime extends BaseRuntime,
> = Simplify<BindAPISurfaces<APIs, Runtime>>;

type BindAPISurfaces<
	APIs extends readonly API[],
	Runtime extends BaseRuntime,
> = APIs extends readonly []
	? Record<never, never>
	: APIs extends readonly [
				infer Head extends API,
				...infer Tail extends readonly API[],
		  ]
		? Runtime extends Head['In']
			? BoundAPI<Head, Runtime> & BindAPISurfaces<Tail, Runtime>
			: never
		: Record<never, never>;

export type ExtensionAPISurface<
	APIs extends readonly API[],
	Runtimes extends readonly BaseRuntime[],
> = [ReduceRuntimes<Runtimes>] extends [never]
	? never
	: ReduceRuntimes<Runtimes> extends infer Runtime extends BaseRuntime
		? AssertAPIListNoOverlap<APIs, Runtime> extends never
			? never
			: BindReducedAPI<APIs, Runtime>
		: never;

export type ExtensionFor<
	APIs extends readonly API[],
	Runtimes extends readonly BaseRuntime[],
> = Extension<ExtensionAPISurface<APIs, Runtimes>>;

export type ExtensionInput<
	APIs extends readonly API[],
	Runtimes extends readonly BaseRuntime[],
> = ExtensionFor<APIs, Runtimes> & ValidateExtensionTuples<APIs, Runtimes>;
