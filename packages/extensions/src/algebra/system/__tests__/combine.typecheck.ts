import { combine } from '../combine.js';
import { systems } from '../builder.js';
import { combineRuntimes } from '../../runtime/combine.js';
import type { API, BaseAPI, StaticAPI } from '../../api/types.js';
import type { BaseRuntime } from '../../runtime/types.js';
import type { BaseState } from '../../state/types.js';
import type {
	CombinableSystem,
	CombineSystems,
	InferBoundAPI,
	RuntimeSystem,
} from '../types.js';

type StubSystem<
	S extends BaseState,
	APISurface extends BaseAPI = Record<never, never>,
	RT extends BaseRuntime = BaseRuntime,
> = RuntimeSystem<S, StaticAPI<APISurface>, RT>;

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

// ---------------------------------------------------------------------------
// Runtime overlap
// ---------------------------------------------------------------------------

type RuntimeA = BaseRuntime & {
	run(): string;
};
type RuntimeB = BaseRuntime & {
	inspect(): number;
};
type RuntimeC = BaseRuntime & {
	run(): number;
};

const _sysWithRuntimeA = null as unknown as StubSystem<
	{ runtimeA: { value: string } },
	Record<never, never>,
	RuntimeA
>;
const _sysWithRuntimeB = null as unknown as StubSystem<
	{ runtimeB: { value: number } },
	Record<never, never>,
	RuntimeB
>;
const _sysWithRuntimeC = null as unknown as StubSystem<
	{ runtimeC: { value: boolean } },
	Record<never, never>,
	RuntimeC
>;

const _combinedDisjointRuntime = combine(_sysWithRuntimeA, _sysWithRuntimeB);
void _combinedDisjointRuntime;

type _CombinableRejectsRuntimeOverlap = _ExpectNever<
	CombinableSystem<typeof _sysWithRuntimeA, typeof _sysWithRuntimeC>
>;

const _invalidRuntimeCombine = combine(
	_sysWithRuntimeA,
	// @ts-expect-error overlapping runtime keys should be rejected at combine() call sites
	_sysWithRuntimeC,
);

const _invalidRuntimeBuilder =
	// @ts-expect-error overlapping runtime keys should be rejected in SystemBuilder.add()
	systems(_sysWithRuntimeA).add(_sysWithRuntimeC);

const _runtimeA = null as unknown as RuntimeA;
const _runtimeB = null as unknown as RuntimeB;
const _runtimeC = null as unknown as RuntimeC;

const _combinedRuntime = combineRuntimes(_runtimeA, _runtimeB);
void _combinedRuntime;

const _invalidCombinedRuntime = combineRuntimes(
	_runtimeA,
	// @ts-expect-error overlapping runtime keys should be rejected in combineRuntimes()
	_runtimeC,
);
void _invalidCombinedRuntime;

// ---------------------------------------------------------------------------
// API families are applied after runtime composition
// ---------------------------------------------------------------------------

interface RuntimeAwareAPISurface<Runtime extends BaseRuntime> {
	useRuntime(handler: (runtime: Runtime) => void): void;
}

interface RuntimeAwareAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: RuntimeAwareAPISurface<this['In']>;
}

type RuntimeAwareSystem = RuntimeSystem<
	{ aware: { value: boolean } },
	RuntimeAwareAPI,
	BaseRuntime
>;

type RuntimeWithExtra = BaseRuntime & {
	extra(): string;
};

type ExtraRuntimeSystem = StubSystem<
	{ extra: { value: string } },
	Record<never, never>,
	RuntimeWithExtra
>;

type CombinedRuntimeAwareAPI = InferBoundAPI<
	CombineSystems<RuntimeAwareSystem, ExtraRuntimeSystem>
>;

const _combinedRuntimeAwareApi = null as unknown as CombinedRuntimeAwareAPI;
/* eslint-disable @typescript-eslint/no-unsafe-call -- the @ts-expect-error below intentionally makes the call site unresolvable */
_combinedRuntimeAwareApi.useRuntime((runtime) => {
	runtime.extra();
	// @ts-expect-error runtime API handlers should see only composed runtime keys
	runtime.missing();
});
/* eslint-enable @typescript-eslint/no-unsafe-call */
