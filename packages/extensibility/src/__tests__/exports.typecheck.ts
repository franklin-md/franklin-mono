import type {
	API,
	BaseAPI,
	BaseRuntime,
	Compiler,
	Extension,
	Registry,
	RegistryView,
	Signature,
	StateHandle,
	StaticSignature,
} from '../index.js';
import {
	compile,
	combineExtensionPoints,
	createApi,
	createExtensionPoint,
	createRegistry,
	createRegistryView,
	defineExtension,
	reduceExtensions,
} from '../index.js';
import {
	defineExtension as defineAuthoredExtension,
	type ExtensionAPI as AuthoringExtensionAPI,
	type ExtensionForModules as AuthoringExtensionForModules,
} from '../authoring.js';
import {
	combine as combineModules,
	combineAll as combineAllModules,
	createDependencyModule,
	type DependencyModule,
	type ExtensionModule,
	type InferRuntime as InferModuleRuntime,
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
const _registryView = createRegistryView(_registryBinding.registry);
const _extension = defineExtension<[]>()(() => {});
const _reduced = reduceExtensions(_extension);
const _combinedExtensionPoint = combineExtensionPoints(
	_extensionPoint,
	_extensionPoint,
);

void _api;
void _registryView;
void _reduced;
void _combinedExtensionPoint;
void compile(
	_extensionPoint,
	{ compile: async () => ({ dispose: async () => {} }) },
	_extension,
);

const _dependency = createDependencyModule('settings', { get: () => 'value' });
type _DependencyModule = DependencyModule<'settings', { get: () => string }>;
type _DependencyRuntime = InferModuleRuntime<typeof _dependency>;
type _AuthoringAPI = AuthoringExtensionAPI<[typeof _dependency]>;
type _AuthoredExtension = AuthoringExtensionForModules<[typeof _dependency]>;
void (null as unknown as _DependencyModule);
void (null as unknown as _DependencyRuntime);
void (null as unknown as _AuthoringAPI);
void (null as unknown as _AuthoredExtension);
void defineAuthoredExtension<[typeof _dependency]>(() => {});
void combineModules(
	_dependency,
	createDependencyModule('auth', { token: 'x' }),
);
void combineAllModules([
	_dependency,
	createDependencyModule('cache', new Map()),
]);

void (null as unknown as _RootBaseExtensionModule);

void (null as unknown as _RemovedStateExtensionModule);

void (null as unknown as _RootBaseStateExtensionModule);
