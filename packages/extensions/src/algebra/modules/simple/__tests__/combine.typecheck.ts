import type { API, StaticAPI } from '../../../api/types.js';
import type { BaseRuntime } from '../../../runtime/types.js';
import type { ExtensionModule } from '../types.js';
import { combine, combineAll } from '../combine.js';
import type { CombineModules, CombinableModule, InferBoundAPI } from '../index.js';

type _ExpectNever<T extends never> = T;

type StubModule<
	APISurface extends object = Record<never, never>,
	Runtime extends BaseRuntime = BaseRuntime,
> = ExtensionModule<StaticAPI<APISurface>, Runtime>;

type APIa = { on(event: string): void };
type APIb = { register(name: string): void };
type APIc = { on(event: number): void };

const _moduleWithApiA = null as unknown as StubModule<APIa>;
const _moduleWithApiB = null as unknown as StubModule<APIb>;
const _moduleWithApiC = null as unknown as StubModule<APIc>;

const _combinedDisjointApi = combine(_moduleWithApiA, _moduleWithApiB);
void _combinedDisjointApi;

type _CombinableRejectsApiOverlap = _ExpectNever<
	CombinableModule<typeof _moduleWithApiA, typeof _moduleWithApiC>
>;

const _invalidApiCombine = combine(
	_moduleWithApiA,
	// @ts-expect-error overlapping API keys should be rejected
	_moduleWithApiC,
);
void _invalidApiCombine;

const _invalidApiBuilder = combineAll([
	_moduleWithApiA,
	// @ts-expect-error overlapping API keys should be rejected by pairwise validation
	_moduleWithApiC,
]);
void _invalidApiBuilder;

type RuntimeA = BaseRuntime & {
	run(): string;
};
type RuntimeB = BaseRuntime & {
	inspect(): number;
};
type RuntimeC = BaseRuntime & {
	run(): number;
};

const _moduleWithRuntimeA = null as unknown as StubModule<
	Record<never, never>,
	RuntimeA
>;
const _moduleWithRuntimeB = null as unknown as StubModule<
	Record<never, never>,
	RuntimeB
>;
const _moduleWithRuntimeC = null as unknown as StubModule<
	Record<never, never>,
	RuntimeC
>;

const _combinedDisjointRuntime = combine(
	_moduleWithRuntimeA,
	_moduleWithRuntimeB,
);
void _combinedDisjointRuntime;

type _CombinableRejectsRuntimeOverlap = _ExpectNever<
	CombinableModule<typeof _moduleWithRuntimeA, typeof _moduleWithRuntimeC>
>;

const _invalidRuntimeCombine = combine(
	_moduleWithRuntimeA,
	// @ts-expect-error overlapping runtime keys should be rejected
	_moduleWithRuntimeC,
);
void _invalidRuntimeCombine;

interface RuntimeAwareAPISurface<Runtime extends BaseRuntime> {
	useRuntime(handler: (runtime: Runtime) => void): void;
}

interface RuntimeAwareAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: RuntimeAwareAPISurface<this['In']>;
}

type RuntimeAwareModule = ExtensionModule<RuntimeAwareAPI, BaseRuntime>;
type ExtraModule = ExtensionModule<StaticAPI<Record<never, never>>, RuntimeB>;

type CombinedRuntimeAwareAPI = InferBoundAPI<
	CombineModules<RuntimeAwareModule, ExtraModule>
>;

const _combinedRuntimeAwareApi = null as unknown as CombinedRuntimeAwareAPI;
_combinedRuntimeAwareApi.useRuntime((runtime) => {
	runtime.inspect();
	// @ts-expect-error runtime-aware API handlers should see only composed runtime keys
	runtime.missing();
});

