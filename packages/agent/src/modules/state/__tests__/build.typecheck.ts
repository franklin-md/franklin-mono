import type { Signature, StaticSignature } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { ExtensionModule } from '@franklin/extensibility/module';
import type { StateExtensionModule } from '../types.js';
import { buildStateExtensionModule } from '../build.js';
import type {
	BuildModules,
	CombinableBuildModule,
	ValidateBuildModules,
} from '../build.js';
import type { InferAPI, InferState } from '../infer.js';

type _ExpectNever<T extends never> = T;

type StubStateModule<
	S extends Record<string, unknown>,
	Surface extends object = Record<never, never>,
	Runtime extends BaseRuntime = BaseRuntime,
> = StateExtensionModule<S, StaticSignature<Surface>, Runtime>;

type StubSimpleModule<
	Surface extends object = Record<never, never>,
	Runtime extends BaseRuntime = BaseRuntime,
> = ExtensionModule<StaticSignature<Surface>, Runtime>;

type CounterState = {
	counter: { value: number };
};

type DependencyRuntime = BaseRuntime & {
	dependency(): string;
};

const _stateModule = null as unknown as StubStateModule<CounterState>;
const _simpleModule = null as unknown as StubSimpleModule<
	Record<never, never>,
	DependencyRuntime
>;

const _mixedModule = buildStateExtensionModule([
	_stateModule,
	_simpleModule,
] as const);
void _mixedModule;

type _MixedState = InferState<typeof _mixedModule>;
const _mixedState = null as unknown as _MixedState;
void _mixedState.counter.value;
// @ts-expect-error lifted simple modules should not contribute persisted state
void _mixedState.dependency;

type _BuiltMixed = BuildModules<
	readonly [typeof _stateModule, typeof _simpleModule]
>;
const _builtMixed = null as unknown as _BuiltMixed;
void _builtMixed;

type _ValidatedMixed = ValidateBuildModules<
	readonly [typeof _stateModule, typeof _simpleModule]
>;
const _validatedMixed = null as unknown as _ValidatedMixed;
void _validatedMixed;

type APIa = { on(event: string): void };
type APIb = { on(event: number): void };

const _stateApiModule = null as unknown as StubStateModule<
	{ a: unknown },
	APIa
>;
const _simpleApiModule = null as unknown as StubSimpleModule<APIb>;

type _CombinableRejectsApiOverlap = _ExpectNever<
	CombinableBuildModule<typeof _stateApiModule, typeof _simpleApiModule>
>;

const _invalidApiBuilder = buildStateExtensionModule([
	_stateApiModule,
	// @ts-expect-error overlapping API keys should be rejected after simple modules are lifted
	_simpleApiModule,
]);
void _invalidApiBuilder;

type RuntimeA = BaseRuntime & {
	shared(): string;
};
type RuntimeB = BaseRuntime & {
	shared(): number;
};
type RuntimeC = BaseRuntime & {
	extra(): boolean;
};

const _stateRuntimeModule = null as unknown as StubStateModule<
	{ runtimeA: unknown },
	Record<never, never>,
	RuntimeA
>;
const _simpleRuntimeModule = null as unknown as StubSimpleModule<
	Record<never, never>,
	RuntimeB
>;
const _simpleExtraModule = null as unknown as StubSimpleModule<
	Record<never, never>,
	RuntimeC
>;

type _CombinableRejectsRuntimeOverlap = _ExpectNever<
	CombinableBuildModule<typeof _stateRuntimeModule, typeof _simpleRuntimeModule>
>;

const _invalidRuntimeBuilder = buildStateExtensionModule([
	_stateRuntimeModule,
	// @ts-expect-error overlapping runtime keys should be rejected after simple modules are lifted
	_simpleRuntimeModule,
]);
void _invalidRuntimeBuilder;

interface RuntimeAwareAPI<Runtime extends BaseRuntime> {
	useRuntime(handler: (runtime: Runtime) => void): void;
}

interface RuntimeAwareSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: RuntimeAwareAPI<this['In']>;
}

type RuntimeAwareModule = StateExtensionModule<
	{ aware: unknown },
	RuntimeAwareSignature,
	BaseRuntime
>;

type CombinedRuntimeAwareAPI = InferAPI<
	BuildModules<readonly [RuntimeAwareModule, typeof _simpleExtraModule]>
>;

const _combinedRuntimeAwareApi = null as unknown as CombinedRuntimeAwareAPI;
/* eslint-disable @typescript-eslint/no-unsafe-call -- the @ts-expect-error below intentionally makes the call site unresolvable */
_combinedRuntimeAwareApi.useRuntime((runtime) => {
	runtime.extra();
	// @ts-expect-error runtime-aware API handlers should see composed runtime keys only
	runtime.missing();
});
/* eslint-enable @typescript-eslint/no-unsafe-call */
