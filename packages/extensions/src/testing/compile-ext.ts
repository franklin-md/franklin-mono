import { compile } from '../algebra/compiler/compile.js';
import { combine } from '../algebra/compiler/combine.js';
import { createStoreCompiler } from '../systems/store/compile/compiler.js';
import { StoreRegistry } from '../systems/store/api/registry/index.js';
import type { StoreRuntime } from '../systems/store/runtime.js';
import type { StoreAPI } from '../systems/store/api/api.js';
import { createEnvironmentCompiler } from '../systems/environment/compile/compiler.js';
import { emptyEnvironmentState } from '../systems/environment/state.js';
import type { EnvironmentRuntime } from '../systems/environment/runtime.js';
import type { ReconfigurableEnvironment } from '../systems/environment/api/types.js';
import type { CoreAPI } from '../systems/core/api/api.js';
import type { FullMiddleware } from '../systems/core/api/middleware/types.js';
import {
	assemble,
	createCoreRegistrar,
} from '../systems/core/compile/registrar/index.js';
import type { BaseRuntime } from '../algebra/runtime/types.js';
import type { Extension } from '../algebra/types/extension.js';

/**
 * Build middleware from a Core-only extension without spinning up a
 * transport. Handlers receive `undefined` as their ctx — tests that
 * touch runtime should use `compileCoreWithStore` / `compileCoreWithEnv`
 * instead.
 *
 * `systemPrompt` handlers registered by the extension are not fired —
 * they belong to the transport path (`buildCoreRuntime`) which these
 * helpers deliberately skip. The registrar's `on('systemPrompt', ...)`
 * accepts them silently; tests that need systemPrompt behaviour must
 * use a full runtime.
 */
export function compileCoreExt<
	Ctx extends BaseRuntime<unknown> = BaseRuntime<unknown>,
>(
	ext: Extension<CoreAPI<Ctx>>,
	getCtx: () => Ctx = (() => undefined) as unknown as () => Ctx,
): { middleware: FullMiddleware } {
	const { api, registered } = createCoreRegistrar<Ctx>();
	ext(api);
	const { middleware } = assemble(registered, getCtx);
	return { middleware };
}

/**
 * Build middleware + a `StoreRuntime` for extensions that combine
 * `CoreAPI<StoreRuntime> & StoreAPI`. The store runtime is materialised
 * via the real `createStoreCompiler`, so `ctx.getStore(...)` in handlers
 * exactly matches production behaviour.
 */
export async function compileCoreWithStore(
	ext: Extension<CoreAPI<StoreRuntime> & StoreAPI>,
): Promise<{ middleware: FullMiddleware; stores: StoreRuntime }> {
	const pendingRegistrations: Parameters<StoreAPI['registerStore']>[] = [];
	const cell: { stores?: StoreRuntime } = {};
	const getCtx = (): StoreRuntime => {
		if (!cell.stores) throw new Error('store runtime accessed before build');
		return cell.stores;
	};

	const storeApi: StoreAPI = {
		registerStore: ((...args: Parameters<StoreAPI['registerStore']>) => {
			pendingRegistrations.push(args);
		}) as StoreAPI['registerStore'],
	};

	const { api, registered } = createCoreRegistrar<StoreRuntime>();
	const combinedApi = {
		...api,
		...storeApi,
	} as CoreAPI<StoreRuntime> & StoreAPI;
	ext(combinedApi);

	cell.stores = await compile(
		createStoreCompiler(new StoreRegistry()),
		(api) => {
			for (const args of pendingRegistrations) {
				(api.registerStore as (...a: unknown[]) => void)(...args);
			}
		},
		{ store: {} },
	);

	const { middleware } = assemble(registered, getCtx);
	return { middleware, stores: cell.stores };
}

/**
 * Build middleware + a runtime exposing both `StoreRuntime` and
 * `EnvironmentRuntime` for extensions whose ctx is `StoreRuntime &
 * EnvironmentRuntime`.
 */
export async function compileCoreWithStoreAndEnv(
	ext: Extension<CoreAPI<StoreRuntime & EnvironmentRuntime> & StoreAPI>,
	env: ReconfigurableEnvironment,
): Promise<{
	middleware: FullMiddleware;
	ctx: StoreRuntime & EnvironmentRuntime;
}> {
	const pendingRegistrations: Parameters<StoreAPI['registerStore']>[] = [];
	const cell: { ctx?: StoreRuntime & EnvironmentRuntime } = {};
	const getCtx = () => {
		if (!cell.ctx) throw new Error('ctx accessed before build');
		return cell.ctx;
	};

	const storeApi: StoreAPI = {
		registerStore: ((...args: Parameters<StoreAPI['registerStore']>) => {
			pendingRegistrations.push(args);
		}) as StoreAPI['registerStore'],
	};

	const { api, registered } = createCoreRegistrar<
		StoreRuntime & EnvironmentRuntime
	>();
	const combinedApi = { ...api, ...storeApi } as CoreAPI<
		StoreRuntime & EnvironmentRuntime
	> &
		StoreAPI;
	ext(combinedApi);

	const combined = combine(
		createStoreCompiler(new StoreRegistry()),
		createEnvironmentCompiler(env),
	);
	cell.ctx = (await compile(
		combined,
		(api) => {
			for (const args of pendingRegistrations) {
				(api.registerStore as (...a: unknown[]) => void)(...args);
			}
		},
		{ store: {}, ...emptyEnvironmentState() },
	)) as StoreRuntime & EnvironmentRuntime;

	const { middleware } = assemble(registered, getCtx);
	return { middleware, ctx: cell.ctx };
}

/**
 * Build middleware + an `EnvironmentRuntime` for extensions whose ctx is
 * just `EnvironmentRuntime` (no store). Useful for simple env-only tools.
 */
export async function compileCoreWithEnv(
	ext: Extension<CoreAPI<EnvironmentRuntime>>,
	env: ReconfigurableEnvironment,
): Promise<{
	middleware: FullMiddleware;
	ctx: EnvironmentRuntime;
}> {
	const cell: { ctx?: EnvironmentRuntime } = {};
	const getCtx = (): EnvironmentRuntime => {
		if (!cell.ctx) throw new Error('ctx accessed before build');
		return cell.ctx;
	};

	const { api, registered } = createCoreRegistrar<EnvironmentRuntime>();
	ext(api);

	cell.ctx = await compile(
		createEnvironmentCompiler(env),
		() => {},
		emptyEnvironmentState(),
	);

	const { middleware } = assemble(registered, getCtx);
	return { middleware, ctx: cell.ctx };
}
