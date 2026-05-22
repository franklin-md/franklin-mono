import type { API, CombineSignature } from '@franklin/extensibility';
import type {
	MiniACPAgent,
	MiniACPClient,
	ToolDefinition,
} from '@franklin/mini-acp';
import { createExtensionPoint } from '@franklin/extensibility';
import { createApi } from '@franklin/extensibility';
import { createRegistryView } from '@franklin/extensibility';
import { createRegistry } from '@franklin/extensibility';
import { combineRuntimes } from '@franklin/extensibility';
import { combineExtensionPoints } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { Extension } from '@franklin/extensibility';
import type { RegistryView } from '@franklin/extensibility';
import {
	createConfigurationModule,
	type ConfigurationModule,
	type ConfigurationRuntime,
	type InferAPI as InferModuleAPI,
	type InferSignature as InferModuleSignature,
} from '@franklin/extensibility/module';
import type { CoreSignature } from '../modules/core/api/api.js';
import type { AuthDependencyRuntime } from '../auth/dependency.js';
import type { AuthManager } from '../auth/manager.js';
import { createPromptBuilder } from '../modules/core/compile/decorators/prompt/build-prompt/index.js';
import { createPromptObserver } from '../modules/core/compile/decorators/prompt/observer/index.js';
import {
	buildToolServerMiddleware,
	createToolRegistry,
	type ToolRegistry,
} from '../modules/core/compile/decorators/tool/index.js';
import {
	passThrough,
	type MethodMiddleware,
	type Middleware,
} from '@franklin/lib/middleware';
import type { CoreRuntime } from '../modules/core/runtime/index.js';
import type { ReconfigurableEnvironment } from '../modules/environment/api/types.js';
import { createEnvironmentCompiler } from '../modules/environment/compile/compiler.js';
import type { EnvironmentRuntime } from '../modules/environment/runtime.js';
import type { StoreAPI, StoreSignature } from '../modules/store/api/api.js';
import { StoreRegistry } from '../modules/store/api/registry/index.js';
import { createStoreCompiler } from '../modules/store/compile/compiler.js';
import type { StoreRuntime } from '../modules/store/runtime.js';
import type { IdentitySignature } from '@franklin/extensibility/module';

type CoreStoreRuntime = CoreRuntime & StoreRuntime;

type ConfigurationSignature = InferModuleSignature<ConfigurationModule>;

type ConfigurationAPI = InferModuleAPI<ConfigurationModule>;

type CoreConfigurationSignature = CombineSignature<
	CoreSignature,
	ConfigurationSignature
>;

type CoreStoreConfigurationSignature = CombineSignature<
	CombineSignature<CoreSignature, StoreSignature>,
	ConfigurationSignature
>;

type CoreEnvironmentConfigurationRuntime = CoreRuntime &
	EnvironmentRuntime &
	ConfigurationRuntime;

type CoreStoreEnvironmentConfigurationRuntime = CoreRuntime &
	StoreRuntime &
	EnvironmentRuntime &
	ConfigurationRuntime;

type CoreStoreEnvironmentAuthRuntime = CoreRuntime &
	StoreRuntime &
	EnvironmentRuntime &
	AuthDependencyRuntime;

type ClientMiddleware = Middleware<MiniACPClient>;

type ServerMiddleware = Middleware<MiniACPAgent>;

type FullMiddleware = {
	readonly client: ClientMiddleware;
	readonly server: ServerMiddleware;
};

const coreExtensionPoint = createExtensionPoint<CoreSignature>({
	on: true,
	registerTool: true,
});

const storeExtensionPoint = createExtensionPoint<StoreSignature>({
	registerStore: true,
});

function buildTestMiddleware<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	toolRegistry: ToolRegistry<Runtime>,
	getCtx: () => Runtime,
): FullMiddleware {
	const buildPrompt = createPromptBuilder(registrations, getCtx);
	const observePrompt = createPromptObserver(registrations, getCtx);
	const prompt: MethodMiddleware<MiniACPClient['prompt']> = async function* (
		message,
		next,
	) {
		yield* observePrompt(next(await buildPrompt(message)));
	};

	const client: ClientMiddleware = {
		initialize: passThrough(),
		setContext: passThrough(),
		prompt,
		cancel: passThrough(),
	};

	return {
		client,
		server: buildToolServerMiddleware(toolRegistry),
	};
}

/**
 * Build middleware from a Core-only extension without spinning up a
 * transport. Handlers receive `undefined` as their ctx — tests that
 * touch runtime should use `compileCoreWithStore` / `compileCoreWithEnv`
 * instead.
 *
 * `systemPrompt` handlers registered by the extension are not fired —
 * they belong to the transport path (`createCoreRuntime`) which these
 * helpers deliberately skip. The registrar's `on('systemPrompt', ...)`
 * accepts them silently; tests that need systemPrompt behaviour must
 * use a full runtime.
 */
export function compileCoreExt<Ctx extends BaseRuntime = BaseRuntime>(
	ext: Extension<API<CoreSignature, Ctx>>,
	getCtx: () => Ctx = (() => undefined) as unknown as () => Ctx,
): { middleware: FullMiddleware; tools: ToolDefinition[] } {
	const { registry, writer } = createRegistry<CoreSignature, Ctx>();
	const api = createApi<CoreSignature, Ctx>(coreExtensionPoint, writer);
	ext(api);
	const registrations = createRegistryView(registry);
	const toolRegistry = createToolRegistry(registrations, getCtx);
	const middleware = buildTestMiddleware(registrations, toolRegistry, getCtx);
	const tools = toolRegistry.definitions();
	return { middleware, tools };
}

/**
 * Build middleware + a `StoreRuntime` for extensions that combine
 * `API<CoreSignature, CoreRuntime & StoreRuntime> & StoreAPI`. The
 * store runtime is materialised via the real `createStoreCompiler`, so
 * `ctx.getStore(...)` in handlers exactly matches production behaviour.
 */
export async function compileCoreWithStore(
	ext: Extension<API<CoreSignature, CoreStoreRuntime> & StoreAPI>,
): Promise<{
	middleware: FullMiddleware;
	stores: StoreRuntime;
	tools: ToolDefinition[];
}> {
	const cell: { stores?: StoreRuntime } = {};
	const getCtx = (): CoreStoreRuntime => {
		if (!cell.stores) throw new Error('store runtime accessed before build');
		return cell.stores as CoreStoreRuntime;
	};

	const { registry: coreRegistry, writer: coreWriter } = createRegistry<
		CoreSignature,
		CoreStoreRuntime
	>();
	const api = createApi<CoreSignature, CoreStoreRuntime>(
		coreExtensionPoint,
		coreWriter,
	);
	const { registry: storeRegistry, writer: storeWriter } = createRegistry<
		StoreSignature,
		CoreStoreRuntime
	>();
	const storeApi = createApi<StoreSignature, CoreStoreRuntime>(
		storeExtensionPoint,
		storeWriter,
	);
	const combinedApi = {
		...api,
		...storeApi,
	} as API<CoreSignature, CoreStoreRuntime> & StoreAPI;
	ext(combinedApi);

	cell.stores = await createStoreCompiler(new StoreRegistry(), {}).compile(
		createRegistryView(storeRegistry),
		getCtx,
	);

	const registrations = createRegistryView(coreRegistry);
	const toolRegistry = createToolRegistry(registrations, getCtx);
	const middleware = buildTestMiddleware(registrations, toolRegistry, getCtx);
	const tools = toolRegistry.definitions();
	return { middleware, stores: cell.stores, tools };
}

/**
 * Build middleware + a runtime exposing both `StoreRuntime` and
 * `EnvironmentRuntime` for extensions whose ctx is `CoreRuntime &
 * StoreRuntime & EnvironmentRuntime`.
 */
export async function compileCoreWithStoreAndEnv(
	ext: Extension<
		API<CoreSignature, CoreStoreEnvironmentConfigurationRuntime> &
			StoreAPI &
			ConfigurationAPI
	>,
	env: ReconfigurableEnvironment,
): Promise<{
	middleware: FullMiddleware;
	ctx: StoreRuntime & EnvironmentRuntime & ConfigurationRuntime;
	tools: ToolDefinition[];
}> {
	const cell: {
		ctx?: StoreRuntime & EnvironmentRuntime & ConfigurationRuntime;
	} = {};
	const getCtx = (): CoreStoreEnvironmentConfigurationRuntime => {
		if (!cell.ctx) throw new Error('ctx accessed before build');
		return cell.ctx as CoreStoreEnvironmentConfigurationRuntime;
	};

	const configurationModule = createConfigurationModule();
	const configurationExtensionPoint = configurationModule.extensionPoint;
	const coreStoreExtensionPoint = combineExtensionPoints<
		CoreSignature,
		StoreSignature
	>(coreExtensionPoint, storeExtensionPoint as never);
	const extensionPoint = combineExtensionPoints<
		CombineSignature<CoreSignature, StoreSignature>,
		ConfigurationSignature
	>(coreStoreExtensionPoint, configurationExtensionPoint as never);
	const { registry, writer } = createRegistry<
		CoreStoreConfigurationSignature,
		CoreStoreEnvironmentConfigurationRuntime
	>();
	const api = createApi(extensionPoint, writer) as API<
		CoreSignature,
		CoreStoreEnvironmentConfigurationRuntime
	> &
		StoreAPI &
		ConfigurationAPI;
	ext(api);

	const registryView = createRegistryView(registry);

	const stores = await createStoreCompiler(new StoreRegistry(), {}).compile(
		registryView as never,
		getCtx,
	);
	const { registry: identityRegistry } = createRegistry<
		IdentitySignature,
		CoreStoreEnvironmentConfigurationRuntime
	>();
	const environment = await createEnvironmentCompiler(env).compile(
		createRegistryView(identityRegistry),
		getCtx,
	);
	const configuration = await configurationModule.compiler.compile(
		registryView as never,
		getCtx,
	);
	cell.ctx = combineRuntimes(
		combineRuntimes(stores, environment),
		configuration,
	);

	const registrations = registryView as never;
	const toolRegistry = createToolRegistry(registrations, getCtx);
	const middleware = buildTestMiddleware(registrations, toolRegistry, getCtx);
	const tools = toolRegistry.definitions();
	return { middleware, ctx: cell.ctx, tools };
}

export async function compileCoreWithStoreEnvAndAuth(
	ext: Extension<
		API<CoreSignature, CoreStoreEnvironmentAuthRuntime> & StoreAPI
	>,
	env: ReconfigurableEnvironment,
	auth: AuthManager,
): Promise<{
	middleware: FullMiddleware;
	ctx: StoreRuntime & EnvironmentRuntime & AuthDependencyRuntime;
	tools: ToolDefinition[];
}> {
	const cell: {
		ctx?: StoreRuntime & EnvironmentRuntime & AuthDependencyRuntime;
	} = {};
	const getCtx = (): CoreStoreEnvironmentAuthRuntime => {
		if (!cell.ctx) throw new Error('ctx accessed before build');
		return cell.ctx as CoreStoreEnvironmentAuthRuntime;
	};

	const { registry: coreRegistry, writer: coreWriter } = createRegistry<
		CoreSignature,
		CoreStoreEnvironmentAuthRuntime
	>();
	const api = createApi<CoreSignature, CoreStoreEnvironmentAuthRuntime>(
		coreExtensionPoint,
		coreWriter,
	);
	const { registry: storeRegistry, writer: storeWriter } = createRegistry<
		StoreSignature,
		CoreStoreEnvironmentAuthRuntime
	>();
	const storeApi = createApi<StoreSignature, CoreStoreEnvironmentAuthRuntime>(
		storeExtensionPoint,
		storeWriter,
	);
	const combinedApi = { ...api, ...storeApi } as API<
		CoreSignature,
		CoreStoreEnvironmentAuthRuntime
	> &
		StoreAPI;
	ext(combinedApi);

	const stores = await createStoreCompiler(new StoreRegistry(), {}).compile(
		createRegistryView(storeRegistry),
		getCtx,
	);
	const { registry: identityRegistry } = createRegistry<
		IdentitySignature,
		CoreStoreEnvironmentAuthRuntime
	>();
	const environment = await createEnvironmentCompiler(env).compile(
		createRegistryView(identityRegistry),
		getCtx,
	);
	cell.ctx = combineRuntimes(combineRuntimes(stores, environment), {
		auth,
		dispose: async () => {},
	});

	const registrations = createRegistryView(coreRegistry);
	const toolRegistry = createToolRegistry(registrations, getCtx);
	const middleware = buildTestMiddleware(registrations, toolRegistry, getCtx);
	const tools = toolRegistry.definitions();
	return { middleware, ctx: cell.ctx, tools };
}

/**
 * Build middleware + an `EnvironmentRuntime` for extensions whose ctx is
 * `CoreRuntime & EnvironmentRuntime` (no store). Useful for simple env-only
 * tools.
 */
export async function compileCoreWithEnv(
	ext: Extension<
		API<CoreSignature, CoreEnvironmentConfigurationRuntime> & ConfigurationAPI
	>,
	env: ReconfigurableEnvironment,
): Promise<{
	middleware: FullMiddleware;
	ctx: EnvironmentRuntime & ConfigurationRuntime;
	tools: ToolDefinition[];
}> {
	const cell: { ctx?: EnvironmentRuntime & ConfigurationRuntime } = {};
	const getCtx = (): CoreEnvironmentConfigurationRuntime => {
		if (!cell.ctx) throw new Error('ctx accessed before build');
		return cell.ctx as CoreEnvironmentConfigurationRuntime;
	};

	const configurationModule = createConfigurationModule();
	const configurationExtensionPoint = configurationModule.extensionPoint;
	const extensionPoint = combineExtensionPoints<
		CoreSignature,
		ConfigurationSignature
	>(coreExtensionPoint, configurationExtensionPoint as never);
	const { registry, writer } = createRegistry<
		CoreConfigurationSignature,
		CoreEnvironmentConfigurationRuntime
	>();
	const api = createApi(extensionPoint, writer) as API<
		CoreSignature,
		CoreEnvironmentConfigurationRuntime
	> &
		ConfigurationAPI;
	ext(api);

	const registryView = createRegistryView(registry);

	const { registry: identityRegistry } = createRegistry<
		IdentitySignature,
		CoreEnvironmentConfigurationRuntime
	>();
	const environment = await createEnvironmentCompiler(env).compile(
		createRegistryView(identityRegistry),
		getCtx,
	);
	const configuration = await configurationModule.compiler.compile(
		registryView as never,
		getCtx,
	);
	cell.ctx = combineRuntimes(environment, configuration);

	const registrations = registryView as never;
	const toolRegistry = createToolRegistry(registrations, getCtx);
	const middleware = buildTestMiddleware(registrations, toolRegistry, getCtx);
	const tools = toolRegistry.definitions();
	return { middleware, ctx: cell.ctx, tools };
}
