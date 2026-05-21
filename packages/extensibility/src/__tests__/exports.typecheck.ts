import type {
	API,
	APITransform,
	APITransformWith,
	BaseAPI,
	BaseRuntime,
	Compiler,
	Extension,
	Registry,
	RegistryView,
	Signature,
	StateHandle,
	StaticSignature,
	WithRuntime,
} from '../index.js';
import {
	bindAllWithRuntime,
	bindWithRuntime,
	compile,
	combineExtensionPoints,
	createApi,
	createExtensionPoint,
	createRegistry,
	createRegistryView,
	defineExtension,
	priority,
	priorityLevels,
	reduceExtensions,
} from '../index.js';
import {
	defineExtension as defineAuthoredExtension,
	type ExtensionAPI as AuthoringExtensionAPI,
	type ExtensionForModules as AuthoringExtensionForModules,
} from '../authoring.js';
import {
	ConfigurationCycleError,
	ConfigurationProvider,
	combine as combineModules,
	combineAll as combineAllModules,
	createConfigurationModule,
	createDependencyModule,
	liftRuntimeFactory,
	type Configuration,
	type ConfigurationModule,
	type ConfigurationReader,
	type ConfigurationCycleEntry,
	type ConfigurationRuntime,
	type DependencyModule,
	type ExtensionModule,
	type InferRuntime as InferModuleRuntime,
	type RuntimeModule,
} from '../module.js';
// @ts-expect-error base module aliases are intentionally kept out of root.
import type { BaseExtensionModule as _RootBaseExtensionModule } from '../index.js';
// @ts-expect-error state module algebra is owned by @franklin/agent.
import type { StateExtensionModule as _RemovedStateExtensionModule } from '../state-module.js';
// @ts-expect-error state module aliases are not part of the extensibility root.
import type { BaseStateExtensionModule as _RootBaseStateExtensionModule } from '../index.js';

type _RootTypes = [
	API<StaticSignature<Record<never, never>>, BaseRuntime>,
	BaseAPI,
	Compiler<StaticSignature<Record<never, never>>, BaseRuntime>,
	Extension<Record<never, never>>,
	ExtensionModule<StaticSignature<Record<never, never>>, BaseRuntime>,
	Registry<StaticSignature<Record<never, never>>, BaseRuntime>,
	RegistryView<StaticSignature<Record<never, never>>, BaseRuntime>,
	Signature,
	StateHandle<Record<never, never>>,
	StaticSignature<Record<never, never>>,
	WithRuntime<() => void, BaseRuntime>,
	APITransform,
	APITransformWith<[value: number]>,
	typeof priority,
	typeof priorityLevels,
];

void (null as unknown as _RootTypes);

const _extensionPoint = createExtensionPoint<
	StaticSignature<Record<never, never>>
>({});
const _registryBinding = createRegistry<
	StaticSignature<Record<never, never>>,
	BaseRuntime
>();
const _api = createApi(_extensionPoint, _registryBinding.writer);
const _highTransform: APITransform = (api) => priority.high(api);
const _customTransform: APITransformWith<[value: number]> = (_value, api) =>
	priority.high(api);
const _defaultPriorityLevel = priorityLevels.default;
const _highPriorityApi = priority.high(_api);
const _customPriorityApi = _customTransform(priorityLevels.high, _api);
const _defaultPriorityApi = priority.default(_api);
const _registryView = createRegistryView(_registryBinding.registry);
const _extension = defineExtension<[]>()(() => {});
const _reduced = reduceExtensions(_extension);
const _combinedExtensionPoint = combineExtensionPoints(
	_extensionPoint,
	_extensionPoint,
);

void _api;
void _highTransform;
void _customTransform;
void _defaultPriorityLevel;
void _highPriorityApi;
void _customPriorityApi;
void _defaultPriorityApi;
void _registryView;
void _reduced;
void _combinedExtensionPoint;
void compile(
	_extensionPoint,
	{ compile: async () => ({ dispose: async () => {} }) },
	_extension,
);

const _dependency = createDependencyModule('settings', { get: () => 'value' });
const _configurationModule = createConfigurationModule();
const _configuration = new ConfigurationProvider<string, string>({
	name: 'exported',
	combine: (values) => values.join(''),
});
type _DependencyModule = DependencyModule<'settings', { get: () => string }>;
type _ConfigurationModule = ConfigurationModule;
type _DependencyRuntime = InferModuleRuntime<typeof _dependency>;
type _ConfigurationRuntime = ConfigurationRuntime;
type _Configuration = Configuration<string, string>;
type _ConfigurationReader = ConfigurationReader;
type _ConfigurationCycleEntry = ConfigurationCycleEntry;
type _RuntimeModule = RuntimeModule<_DependencyRuntime>;
type _AuthoringAPI = AuthoringExtensionAPI<[typeof _dependency]>;
type _AuthoredExtension = AuthoringExtensionForModules<[typeof _dependency]>;
declare const _configurationRuntime: ConfigurationRuntime;
const _configurationValue: string =
	_configurationRuntime.getConfig(_configuration);
void (null as unknown as _DependencyModule);
void (null as unknown as _ConfigurationModule);
void (null as unknown as _Configuration);
void (null as unknown as _ConfigurationReader);
void (null as unknown as _ConfigurationCycleEntry);
void (null as unknown as _DependencyRuntime);
void (null as unknown as _ConfigurationRuntime);
void (null as unknown as _RuntimeModule);
void (null as unknown as _AuthoringAPI);
void (null as unknown as _AuthoredExtension);
void _configurationModule;
void _configurationValue;
void ConfigurationCycleError;
void liftRuntimeFactory(async () => ({ dispose: async () => {} }));
void defineAuthoredExtension<[typeof _dependency]>(() => {});
void combineModules(
	_dependency,
	createDependencyModule('auth', { token: 'x' }),
);
void combineAllModules([
	_dependency,
	createDependencyModule('cache', new Map()),
]);
const _runtimeOnlyHandler: WithRuntime<() => void, BaseRuntime> = (
	_runtime,
) => {};
void bindWithRuntime(_runtimeOnlyHandler, () => ({
	dispose: async () => {},
}));
void bindAllWithRuntime([_runtimeOnlyHandler], () => ({
	dispose: async () => {},
}));

void (null as unknown as _RootBaseExtensionModule);

void (null as unknown as _RemovedStateExtensionModule);

void (null as unknown as _RootBaseStateExtensionModule);
