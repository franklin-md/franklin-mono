import type { BoundAPI } from '../algebra/api/index.js';
import { combine } from '../algebra/compiler/combine.js';
import { compile } from '../algebra/compiler/compile.js';
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
import type { StoreAPISurface } from '../modules/store/api/api.js';
import { StoreRegistry } from '../modules/store/api/registry/index.js';
import { createStoreCompiler } from '../modules/store/compile/compiler.js';
import type { StoreRuntime } from '../modules/store/runtime.js';

type CoreStoreRuntime = CoreRuntime & StoreRuntime;

type CoreEnvironmentRuntime = CoreRuntime & EnvironmentRuntime;

type CoreStoreEnvironmentRuntime = CoreRuntime &
	StoreRuntime &
	EnvironmentRuntime;

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
	const { api, registrations } = createCoreRegistrar<Ctx>();
	ext(api);
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
	const pendingRegistrations: Parameters<StoreAPISurface['registerStore']>[] =
		[];
	const cell: { stores?: StoreRuntime } = {};
	const getCtx = (): CoreStoreRuntime => {
		if (!cell.stores) throw new Error('store runtime accessed before build');
		return cell.stores as CoreStoreRuntime;
	};

	const storeApi: StoreAPISurface = {
		registerStore: ((...args: Parameters<StoreAPISurface['registerStore']>) => {
			pendingRegistrations.push(args);
		}) as StoreAPISurface['registerStore'],
	};

	const { api, registrations } = createCoreRegistrar<CoreStoreRuntime>();
	const combinedApi = {
		...api,
		...storeApi,
	} as BoundAPI<CoreAPI, CoreStoreRuntime> & StoreAPISurface;
	ext(combinedApi);

	cell.stores = await compile(
		createStoreCompiler(new StoreRegistry(), { store: {} }),
		(api) => {
			for (const args of pendingRegistrations) {
				(api.registerStore as (...a: unknown[]) => void)(...args);
			}
		},
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
	const pendingRegistrations: Parameters<StoreAPISurface['registerStore']>[] =
		[];
	const cell: { ctx?: StoreRuntime & EnvironmentRuntime } = {};
	const getCtx = (): CoreStoreEnvironmentRuntime => {
		if (!cell.ctx) throw new Error('ctx accessed before build');
		return cell.ctx as CoreStoreEnvironmentRuntime;
	};

	const storeApi: StoreAPISurface = {
		registerStore: ((...args: Parameters<StoreAPISurface['registerStore']>) => {
			pendingRegistrations.push(args);
		}) as StoreAPISurface['registerStore'],
	};

	const { api, registrations } =
		createCoreRegistrar<CoreStoreEnvironmentRuntime>();
	const combinedApi = { ...api, ...storeApi } as BoundAPI<
		CoreAPI,
		CoreStoreEnvironmentRuntime
	> &
		StoreAPISurface;
	ext(combinedApi);

	const combined = combine(
		createStoreCompiler(new StoreRegistry(), { store: {} }),
		createEnvironmentCompiler(env),
	);
	cell.ctx = (await compile(combined, (api) => {
		for (const args of pendingRegistrations) {
			(api.registerStore as (...a: unknown[]) => void)(...args);
		}
	})) as StoreRuntime & EnvironmentRuntime;

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

	const { api, registrations } = createCoreRegistrar<CoreEnvironmentRuntime>();
	ext(api);

	cell.ctx = await compile(createEnvironmentCompiler(env), () => {});

	const middleware = buildMiddleware(registrations, getCtx);
	const tools = registrations.tools.map(serializeTool);
	return { middleware, ctx: cell.ctx, tools };
}
