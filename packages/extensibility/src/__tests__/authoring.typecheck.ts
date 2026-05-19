import {
	type BaseRuntime,
	defineExtension,
	type ExtensionAPI,
	type ExtensionForModules,
	type Signature,
	type StaticSignature,
} from '../index.js';
import type { ExtensionModule } from '../module.js';

type CoreAPI<R extends BaseRuntime> = {
	on(event: 'cancel', handler: () => void): void;
	on(event: 'systemPrompt', handler: (prompt: unknown, ctx: R) => void): void;
};

interface CoreSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: CoreAPI<this['In']>;
}

type CoreModule = ExtensionModule<CoreSignature, BaseRuntime>;

type StoreRuntime = BaseRuntime & {
	getStore(name: string): unknown;
};

type StoreModule = ExtensionModule<
	StaticSignature<{
		registerStore(name: string, initial: unknown, sharing: string): void;
	}>,
	StoreRuntime
>;

type EnvironmentModule = ExtensionModule<
	StaticSignature<Record<never, never>>,
	BaseRuntime & { readonly environment: unknown }
>;

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

type _AliasAPI = ExtensionAPI<[CoreModule, StoreModule, EnvironmentModule]>;
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

type SettingsRuntime = BaseRuntime & {
	readonly settings: {
		get(): string;
	};
};

type SettingsModule = ExtensionModule<
	StaticSignature<Record<never, never>>,
	SettingsRuntime
>;

const _mixedModuleExtension = defineExtension<[CoreModule, SettingsModule]>(
	(api) => {
		api.on('systemPrompt', (_prompt, ctx) => {
			ctx.settings.get();
			// @ts-expect-error store API was not requested
			void ctx.getStore;
		});
	},
);
void _mixedModuleExtension;

type APIa = { on(event: string): void };
type APIb = { on(event: number): void };

const _duplicateAPI = defineExtension<
	[
		ExtensionModule<StaticSignature<APIa>, BaseRuntime>,
		ExtensionModule<StaticSignature<APIb>, BaseRuntime>,
	]
>(
	// @ts-expect-error duplicate API keys should be rejected
	() => {},
);
void _duplicateAPI;

type RuntimeA = BaseRuntime & { readonly shared: string };
type RuntimeB = BaseRuntime & { readonly shared: number };

const _duplicateRuntime = defineExtension<
	[
		ExtensionModule<StaticSignature<Record<never, never>>, RuntimeA>,
		ExtensionModule<StaticSignature<Record<never, never>>, RuntimeB>,
	]
>(
	// @ts-expect-error duplicate runtime extras should be rejected
	() => {},
);
void _duplicateRuntime;
