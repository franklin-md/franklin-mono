import {
	type BaseRuntime,
	type BaseState,
	type CoreModule,
	defineExtension,
	type EnvironmentModule,
	type ExtensionApi,
	type ExtensionForModules,
	type HarnessModule,
	type StaticAPI,
	type StoreModule,
} from '../../../index.js';

type StubModule<
	S extends BaseState,
	APISurface extends object = Record<never, never>,
	Runtime extends BaseRuntime = BaseRuntime,
> = HarnessModule<S, StaticAPI<APISurface>, Runtime>;

const _moduleExtension = defineExtension<
	[CoreModule, StoreModule, EnvironmentModule]
>((api) => {
	api.registerStore('typecheck', {}, 'private');

	api.on('systemPrompt', (_prompt, ctx) => {
		void ctx.environment;
		void ctx.getStore;
		// @ts-expect-error orchestrator runtime was not requested
		void ctx.orchestrator;
	});
});
void _moduleExtension;

const _curriedExtension = defineExtension<[CoreModule]>()((api) => {
	api.on('cancel', () => {});
	// @ts-expect-error store API was not requested
	void api.registerStore;
});
void _curriedExtension;

type _AliasAPI = ExtensionApi<[CoreModule, StoreModule, EnvironmentModule]>;
const _aliasApi = null as unknown as _AliasAPI;
_aliasApi.registerStore('alias', {}, 'private');
_aliasApi.on('systemPrompt', (_prompt, ctx) => {
	void ctx.environment;
	void ctx.getStore;
});

const _aliasExtension: ExtensionForModules<[CoreModule, StoreModule]> =
	defineExtension<[CoreModule, StoreModule]>((api) => {
		api.registerStore('alias-extension', {}, 'private');
	});
void _aliasExtension;

type APIa = { on(event: string): void };
type APIb = { on(event: number): void };

const _duplicateAPI = defineExtension<
	[StubModule<{ a: unknown }, APIa>, StubModule<{ b: unknown }, APIb>]
>(
	// @ts-expect-error duplicate API keys should be rejected
	() => {},
);
void _duplicateAPI;

type RuntimeA = BaseRuntime & { readonly shared: string };
type RuntimeB = BaseRuntime & { readonly shared: number };

const _duplicateRuntime = defineExtension<
	[
		StubModule<{ a: unknown }, Record<never, never>, RuntimeA>,
		StubModule<{ b: unknown }, Record<never, never>, RuntimeB>,
	]
>(
	// @ts-expect-error duplicate runtime extras should be rejected
	() => {},
);
void _duplicateRuntime;
