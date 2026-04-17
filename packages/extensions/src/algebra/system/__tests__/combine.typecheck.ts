import { combine } from '../combine.js';
import { systems } from '../builder.js';
import type { BaseAPI } from '../../api/types.js';
import type { BaseRuntime } from '../../runtime/types.js';
import type { BaseState } from '../../state/types.js';
import type { CombinableSystem, RuntimeSystem } from '../types.js';

type StubSystem<
	S extends BaseState,
	API extends BaseAPI = Record<never, never>,
> = RuntimeSystem<S, API, BaseRuntime<S>>;

type _ExpectNever<T extends never> = T;

// ---------------------------------------------------------------------------
// State overlap
// ---------------------------------------------------------------------------

const _environmentSystem = null as unknown as StubSystem<{
	env: { cwd: string };
}>;
const _storeSystem = null as unknown as StubSystem<{
	store: { count: number };
}>;
const _sharedNumberSystem = null as unknown as StubSystem<{
	shared: number;
}>;
const _sharedStringSystem = null as unknown as StubSystem<{
	shared: string;
}>;

const _combinedSystem = combine(_environmentSystem, _storeSystem);
void _combinedSystem;

const _builtSystem = systems(_environmentSystem).add(_storeSystem).done();
void _builtSystem;

// The type-level overlap guard lives on the second operand via
// `Sys2 & CombinableSystem<Sys1, Sys2>`. The predicate itself reduces to
// `never` when the two systems overlap, which collapses the intersection.
type _CombinableRejectsStateOverlap = _ExpectNever<
	CombinableSystem<typeof _sharedNumberSystem, typeof _sharedStringSystem>
>;

const _invalidCombinedSystem = combine(
	_sharedNumberSystem,
	// @ts-expect-error overlapping state keys should be rejected at combine() call sites
	_sharedStringSystem,
);

const _invalidBuiltSystem =
	// @ts-expect-error overlapping state keys should be rejected in SystemBuilder.add()
	systems(_sharedNumberSystem).add(_sharedStringSystem);

// ---------------------------------------------------------------------------
// API overlap
// ---------------------------------------------------------------------------

type APIa = { on(event: string): void };
type APIb = { register(name: string): void };
type APIc = { on(event: number): void };

const _sysWithApiA = null as unknown as StubSystem<
	{ a: { value: string } },
	APIa
>;
const _sysWithApiB = null as unknown as StubSystem<
	{ b: { value: number } },
	APIb
>;
const _sysWithApiC = null as unknown as StubSystem<
	{ c: { value: boolean } },
	APIc
>;

const _combinedDisjointApi = combine(_sysWithApiA, _sysWithApiB);
void _combinedDisjointApi;

type _CombinableRejectsApiOverlap = _ExpectNever<
	CombinableSystem<typeof _sysWithApiA, typeof _sysWithApiC>
>;

const _invalidApiCombine = combine(
	_sysWithApiA,
	// @ts-expect-error overlapping API keys should be rejected at combine() call sites
	_sysWithApiC,
);

const _invalidApiBuilder =
	// @ts-expect-error overlapping API keys should be rejected in SystemBuilder.add()
	systems(_sysWithApiA).add(_sysWithApiC);
