import type { Signature, StaticSignature } from '../../../api/types.js';
import type { BaseRuntime } from '../../../runtime/types.js';
import type { StateExtensionModule } from '../types.js';
import { buildStateExtensionModule } from '../build.js';
import { combine, combineAll } from '../combine.js';
import type { CombinableModule, CombineModules, InferAPI } from '../index.js';

type _ExpectNever<T extends never> = T;

type StubModule<
	S extends Record<string, unknown>,
	APISurface extends object = Record<never, never>,
	Runtime extends BaseRuntime = BaseRuntime,
> = StateExtensionModule<S, StaticSignature<APISurface>, Runtime>;

const _counterModule = null as unknown as StubModule<{
	counter: { value: number };
}>;
const _labelModule = null as unknown as StubModule<{
	label: { value: string };
}>;

const _combinedDisjointState = combine(_counterModule, _labelModule);
void _combinedDisjointState;

const _builtDisjointState = buildStateExtensionModule([
	_counterModule,
	_labelModule,
] as const);
void _builtDisjointState;

const _sharedNumberModule = null as unknown as StubModule<{
	shared: number;
}>;
const _sharedStringModule = null as unknown as StubModule<{
	shared: string;
}>;
const _counterStringModule = null as unknown as StubModule<{
	counter: { value: string };
}>;

type _CombinableRejectsStateOverlap = _ExpectNever<
	CombinableModule<typeof _sharedNumberModule, typeof _sharedStringModule>
>;

const _invalidStateCombine = combine(
	_sharedNumberModule,
	// @ts-expect-error overlapping state keys should be rejected
	_sharedStringModule,
);
void _invalidStateCombine;

const _invalidAccumulatedStateBuilder = combineAll([
	_counterModule,
	_labelModule,
	// @ts-expect-error overlapping state keys should be rejected against accumulated modules
	_counterStringModule,
]);
void _invalidAccumulatedStateBuilder;

type APIa = { on(event: string): void };
type APIb = { on(event: number): void };

const _apiModuleA = null as unknown as StubModule<{ a: unknown }, APIa>;
const _apiModuleB = null as unknown as StubModule<{ b: unknown }, APIb>;

const _invalidApiCombine = combine(
	_apiModuleA,
	// @ts-expect-error overlapping API keys should be rejected
	_apiModuleB,
);
void _invalidApiCombine;

type RuntimeA = BaseRuntime & {
	run(): string;
};
type RuntimeB = BaseRuntime & {
	run(): number;
};
type RuntimeC = BaseRuntime & {
	inspect(): number;
};

const _runtimeModuleA = null as unknown as StubModule<
	{ runtimeA: unknown },
	Record<never, never>,
	RuntimeA
>;
const _runtimeModuleB = null as unknown as StubModule<
	{ runtimeB: unknown },
	Record<never, never>,
	RuntimeB
>;
const _runtimeModuleC = null as unknown as StubModule<
	{ runtimeC: unknown },
	Record<never, never>,
	RuntimeC
>;

const _invalidRuntimeCombine = combine(
	_runtimeModuleA,
	// @ts-expect-error overlapping runtime keys should be rejected
	_runtimeModuleB,
);
void _invalidRuntimeCombine;

interface RuntimeAwareAPISurface<Runtime extends BaseRuntime> {
	useRuntime(handler: (runtime: Runtime) => void): void;
}

interface RuntimeAwareSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: RuntimeAwareAPISurface<this['In']>;
}

type RuntimeAwareModule = StateExtensionModule<
	{ aware: unknown },
	RuntimeAwareSignature,
	BaseRuntime
>;
type ExtraModule = StateExtensionModule<
	{ extra: unknown },
	StaticSignature<Record<never, never>>,
	RuntimeC
>;

type CombinedRuntimeAwareAPI = InferAPI<
	CombineModules<RuntimeAwareModule, ExtraModule>
>;

const _combinedRuntimeAwareApi = null as unknown as CombinedRuntimeAwareAPI;
/* eslint-disable @typescript-eslint/no-unsafe-call -- the @ts-expect-error below intentionally makes the call site unresolvable */
_combinedRuntimeAwareApi.useRuntime((runtime) => {
	runtime.inspect();
	// @ts-expect-error runtime-aware API handlers should see only composed runtime keys
	runtime.missing();
});
/* eslint-enable @typescript-eslint/no-unsafe-call */
