import type { API } from '@franklin/extensibility';
import { createExtensionPoint } from '@franklin/extensibility';
import { createApi } from '@franklin/extensibility';
import { createRegistryView } from '@franklin/extensibility';
import { createRegistry } from '@franklin/extensibility';
import { combineRuntimes } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { Extension } from '@franklin/extensibility';
import type { CoreSignature } from '../modules/core/api/api.js';
import type { SerializedToolDefinition } from '../modules/core/api/tools/index.js';
import { serializeTool } from '../modules/core/api/tools/index.js';
import { buildMiddleware } from '../modules/core/compile/decorators/middleware/build.js';
import type { FullMiddleware } from '../modules/core/compile/decorators/middleware/types.js';
import { createCoreRegistrar } from '../modules/core/compile/registrar/index.js';
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

type CoreEnvironmentRuntime = CoreRuntime & EnvironmentRuntime;

type CoreStoreEnvironmentRuntime = CoreRuntime &
	StoreRuntime &
	EnvironmentRuntime;

const coreExtensionPoint = createExtensionPoint<CoreSignature>({
	on: true,
	registerTool: true,
});

const storeExtensionPoint = createExtensionPoint<StoreSignature>({
	registerStore: true,
});

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
): { middleware: FullMiddleware; tools: SerializedToolDefinition[] } {
	const { registry, writer } = createRegistry<CoreSignature, Ctx>();
	const api = createApi<CoreSignature, Ctx>(coreExtensionPoint, writer);
	ext(api);
	const registrations = createCoreRegistrar<Ctx>(createRegistryView(registry));
	const middleware = buildMiddleware(registrations, getCtx);
	const tools = registrations.tools.map(serializeTool);
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
	tools: SerializedToolDefinition[];
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

	const registrations = createCoreRegistrar<CoreStoreRuntime>(
		createRegistryView(coreRegistry),
	);
	const middleware = buildMiddleware(registrations, getCtx);
	const tools = registrations.tools.map(serializeTool);
	return { middleware, stores: cell.stores, tools };
}

/**
 * Build middleware + a runtime exposing both `StoreRuntime` and
 * `EnvironmentRuntime` for extensions whose ctx is `CoreRuntime &
 * StoreRuntime & EnvironmentRuntime`.
 */
export async function compileCoreWithStoreAndEnv(
	ext: Extension<API<CoreSignature, CoreStoreEnvironmentRuntime> & StoreAPI>,
	env: ReconfigurableEnvironment,
): Promise<{
	middleware: FullMiddleware;
	ctx: StoreRuntime & EnvironmentRuntime;
	tools: SerializedToolDefinition[];
}> {
	const cell: { ctx?: StoreRuntime & EnvironmentRuntime } = {};
	const getCtx = (): CoreStoreEnvironmentRuntime => {
		if (!cell.ctx) throw new Error('ctx accessed before build');
		return cell.ctx as CoreStoreEnvironmentRuntime;
	};

	const { registry: coreRegistry, writer: coreWriter } = createRegistry<
		CoreSignature,
		CoreStoreEnvironmentRuntime
	>();
	const api = createApi<CoreSignature, CoreStoreEnvironmentRuntime>(
		coreExtensionPoint,
		coreWriter,
	);
	const { registry: storeRegistry, writer: storeWriter } = createRegistry<
		StoreSignature,
		CoreStoreEnvironmentRuntime
	>();
	const storeApi = createApi<StoreSignature, CoreStoreEnvironmentRuntime>(
		storeExtensionPoint,
		storeWriter,
	);
	const combinedApi = { ...api, ...storeApi } as API<
		CoreSignature,
		CoreStoreEnvironmentRuntime
	> &
		StoreAPI;
	ext(combinedApi);

	const stores = await createStoreCompiler(new StoreRegistry(), {}).compile(
		createRegistryView(storeRegistry),
		getCtx,
	);
	const { registry: identityRegistry } = createRegistry<
		IdentitySignature,
		CoreStoreEnvironmentRuntime
	>();
	const environment = await createEnvironmentCompiler(env).compile(
		createRegistryView(identityRegistry),
		getCtx,
	);
	cell.ctx = combineRuntimes(stores, environment);

	const registrations = createCoreRegistrar<CoreStoreEnvironmentRuntime>(
		createRegistryView(coreRegistry),
	);
	const middleware = buildMiddleware(registrations, getCtx);
	const tools = registrations.tools.map(serializeTool);
	return { middleware, ctx: cell.ctx, tools };
}

/**
 * Build middleware + an `EnvironmentRuntime` for extensions whose ctx is
 * `CoreRuntime & EnvironmentRuntime` (no store). Useful for simple env-only
 * tools.
 */
export async function compileCoreWithEnv(
	ext: Extension<API<CoreSignature, CoreEnvironmentRuntime>>,
	env: ReconfigurableEnvironment,
): Promise<{
	middleware: FullMiddleware;
	ctx: EnvironmentRuntime;
	tools: SerializedToolDefinition[];
}> {
	const cell: { ctx?: EnvironmentRuntime } = {};
	const getCtx = (): CoreEnvironmentRuntime => {
		if (!cell.ctx) throw new Error('ctx accessed before build');
		return cell.ctx as CoreEnvironmentRuntime;
	};

	const { registry, writer } = createRegistry<
		CoreSignature,
		CoreEnvironmentRuntime
	>();
	const api = createApi<CoreSignature, CoreEnvironmentRuntime>(
		coreExtensionPoint,
		writer,
	);
	ext(api);

	const { registry: identityRegistry } = createRegistry<
		IdentitySignature,
		CoreEnvironmentRuntime
	>();
	cell.ctx = await createEnvironmentCompiler(env).compile(
		createRegistryView(identityRegistry),
		getCtx,
	);

	const registrations = createCoreRegistrar<CoreEnvironmentRuntime>(
		createRegistryView(registry),
	);
	const middleware = buildMiddleware(registrations, getCtx);
	const tools = registrations.tools.map(serializeTool);
	return { middleware, ctx: cell.ctx, tools };
}
