import type { AssertNoOverlap, Simplify } from '@franklin/lib';
import type { API, BoundAPI, ComposeAPI, StaticAPI } from '../api/index.js';
import type {
	BaseRuntime,
	CombinedRuntime,
	RuntimeExtras,
} from '../runtime/index.js';
import type { Extension } from './extension.js';

export type ReduceAPIs<APIs extends readonly API[]> = APIs extends readonly []
	? StaticAPI<Record<never, never>>
	: APIs extends readonly [infer Only extends API]
		? Only
		: APIs extends readonly [
					infer Head extends API,
					...infer Tail extends readonly API[],
			  ]
			? ComposeAPI<Head, ReduceAPIs<Tail>>
			: StaticAPI<Record<never, never>>;

export type ReduceRuntimes<Runtimes extends readonly BaseRuntime[]> =
	Runtimes extends readonly []
		? BaseRuntime
		: Runtimes extends readonly [infer Only extends BaseRuntime]
			? Only
			: Runtimes extends readonly [
						infer Head extends BaseRuntime,
						...infer Tail extends readonly BaseRuntime[],
				  ]
				? CombinedRuntime<Head, ReduceRuntimes<Tail>>
				: BaseRuntime;

type AssertRuntimeListNoOverlap<
	Runtimes extends readonly BaseRuntime[],
	Accumulated extends object = Record<never, never>,
> = Runtimes extends readonly [
	infer Head extends BaseRuntime,
	...infer Tail extends readonly BaseRuntime[],
]
	? AssertNoOverlap<Accumulated, RuntimeExtras<Head>> extends never
		? never
		: AssertRuntimeListNoOverlap<Tail, Accumulated & RuntimeExtras<Head>>
	: unknown;

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
> =
	AssertRuntimeListNoOverlap<Runtimes> extends never
		? never
		: AssertAPIListNoOverlap<APIs, ReduceRuntimes<Runtimes>> extends never
			? never
			: unknown;

type BindReducedAPI<
	APIs extends readonly API[],
	Runtime extends BaseRuntime,
> = Runtime extends ReduceAPIs<APIs>['In']
	? Simplify<BoundAPI<ReduceAPIs<APIs>, Runtime>>
	: never;

export type ExtensionAPISurface<
	APIs extends readonly API[],
	Runtimes extends readonly BaseRuntime[],
> =
	ValidateExtensionTuples<APIs, Runtimes> extends never
		? never
		: BindReducedAPI<APIs, ReduceRuntimes<Runtimes>>;

export type ExtensionFor<
	APIs extends readonly API[],
	Runtimes extends readonly BaseRuntime[],
> = Extension<ExtensionAPISurface<APIs, Runtimes>>;

export function createExtension<
	APIs extends readonly API[],
	Runtimes extends readonly BaseRuntime[],
>(): (
	extension: Extension<ExtensionAPISurface<APIs, Runtimes>> &
		ValidateExtensionTuples<APIs, Runtimes>,
) => ExtensionFor<APIs, Runtimes>;

export function createExtension<
	APIs extends readonly API[],
	Runtimes extends readonly BaseRuntime[],
>(
	extension: Extension<ExtensionAPISurface<APIs, Runtimes>> &
		ValidateExtensionTuples<APIs, Runtimes>,
): ExtensionFor<APIs, Runtimes>;

export function createExtension(extension?: Extension<never>): unknown {
	if (extension !== undefined) return extension;
	return (next: Extension<never>) => next;
}
