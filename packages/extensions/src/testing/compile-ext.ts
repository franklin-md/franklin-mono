import type { BoundAPI } from '../algebra/api/index.js';
import { createExtensionPoint } from '../algebra/extension-points/create.js';
import { createApi } from '../algebra/extension-points/facade.js';
import { createRegistryView } from '../algebra/extension-points/view.js';
import { createRegistry } from '../algebra/extension-points/writer.js';
import { combineRuntimes } from '../algebra/runtime/index.js';
import type { BaseRuntime } from '../algebra/runtime/types.js';
import type { Extension } from '../algebra/extension/index.js';
import type { CoreAPI } from '../modules/core/api/api.js';
import type { SerializedToolDefinition } from '../modules/core/api/tools/index.js';
import { serializeTool } from '../modules/core/api/tools/index.js';
import { buildMiddleware } from '../modules/core/compile/decorators/middleware/build.js';
import type { FullMiddleware } from '../modules/core/compile/decorators/middleware/types.js';
import { createCoreRegistrar } from '../modules/core/compile/registrar/index.js';
import type { CoreRuntime } from '../modules/core/runtime/index.js';
import type { ReconfigurableEnvironment } from '../modules/environment/api/types.js';
import { createEnvironmentCompiler } from '../modules/environment/compile/compiler.js';
import type { EnvironmentRuntime } from '../modules/environment/runtime.js';
import type { StoreAPI, StoreAPISurface } from '../modules/store/api/api.js';
import { StoreRegistry } from '../modules/store/api/registry/index.js';
import { createStoreCompiler } from '../modules/store/compile/compiler.js';
import type { StoreRuntime } from '../modules/store/runtime.js';
import type { IdentityAPI } from '../algebra/modules/simple/identity.js';

type CoreStoreRuntime = CoreRuntime & StoreRuntime;

type CoreEnvironmentRuntime = CoreRuntime & EnvironmentRuntime;

type CoreStoreEnvironmentRuntime = CoreRuntime &
	StoreRuntime &
	EnvironmentRuntime;

const coreExtensionPoint = createExtensionPoint<CoreAPI>({
	on: true,
	registerTool: true,
});

const storeExtensionPoint = createExtensionPoint<StoreAPI>({
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
	ext: Extension<BoundAPI<CoreAPI, Ctx>>,
	getCtx: () => Ctx = (() => undefined) as unknown as () => Ctx,
): { middleware: FullMiddleware; tools: SerializedToolDefinition[] } {
	const { registry, writer } = createRegistry<CoreAPI, Ctx>();
	const api = createApi<CoreAPI, Ctx>(coreExtensionPoint, writer);
	ext(api);
	const registrations = createCoreRegistrar<Ctx>(createRegistryView(registry));
	const middleware = buildMiddleware(registrations, getCtx);
	const tools = registrations.tools.map(serializeTool);
	return { middleware, tools };
}

/**
 * Build middleware + a `StoreRuntime` for extensions that combine
 * `BoundAPI<CoreAPI, CoreRuntime & StoreRuntime> & StoreAPISurface`. The
 * store runtime is materialised via the real `createStoreCompiler`, so
 * `ctx.getStore(...)` in handlers exactly matches production behaviour.
 */
export async function compileCoreWithStore(
	ext: Extension<BoundAPI<CoreAPI, CoreStoreRuntime> & StoreAPISurface>,
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
		CoreAPI,
		CoreStoreRuntime
	>();
	const api = createApi<CoreAPI, CoreStoreRuntime>(
		coreExtensionPoint,
		coreWriter,
	);
	const { registry: storeRegistry, writer: storeWriter } = createRegistry<
		StoreAPI,
		CoreStoreRuntime
	>();
	const storeApi = createApi<StoreAPI, CoreStoreRuntime>(
		storeExtensionPoint,
		storeWriter,
	);
	const combinedApi = {
		...api,
		...storeApi,
	} as BoundAPI<CoreAPI, CoreStoreRuntime> & StoreAPISurface;
	ext(combinedApi);

	cell.stores = await createStoreCompiler(new StoreRegistry(), {
		store: {},
	}).compile(createRegistryView(storeRegistry), getCtx);

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
	ext: Extension<
		BoundAPI<CoreAPI, CoreStoreEnvironmentRuntime> & StoreAPISurface
	>,
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
		CoreAPI,
		CoreStoreEnvironmentRuntime
	>();
	const api = createApi<CoreAPI, CoreStoreEnvironmentRuntime>(
		coreExtensionPoint,
		coreWriter,
	);
	const { registry: storeRegistry, writer: storeWriter } = createRegistry<
		StoreAPI,
		CoreStoreEnvironmentRuntime
	>();
	const storeApi = createApi<StoreAPI, CoreStoreEnvironmentRuntime>(
		storeExtensionPoint,
		storeWriter,
	);
	const combinedApi = { ...api, ...storeApi } as BoundAPI<
		CoreAPI,
		CoreStoreEnvironmentRuntime
	> &
		StoreAPISurface;
	ext(combinedApi);

	const stores = await createStoreCompiler(new StoreRegistry(), {
		store: {},
	}).compile(createRegistryView(storeRegistry), getCtx);
	const { registry: identityRegistry } = createRegistry<
		IdentityAPI,
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
	ext: Extension<BoundAPI<CoreAPI, CoreEnvironmentRuntime>>,
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
		CoreAPI,
		CoreEnvironmentRuntime
	>();
	const api = createApi<CoreAPI, CoreEnvironmentRuntime>(
		coreExtensionPoint,
		writer,
	);
	ext(api);

	const { registry: identityRegistry } = createRegistry<
		IdentityAPI,
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
