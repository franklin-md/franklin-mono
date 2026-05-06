import type {
	BaseRuntime,
	CoreAPI,
	EnvironmentRuntime,
	StoreAPI,
	StoreRuntime,
} from '../../../index.js';
import { createExtension } from '../create.js';

const _storeEnvironmentExtension = createExtension<
	[CoreAPI, StoreAPI],
	[EnvironmentRuntime, StoreRuntime]
>((api) => {
	api.registerStore('typecheck', {}, 'private');

	api.on('systemPrompt', (_prompt, ctx) => {
		void ctx.environment;
		void ctx.getStore;
		// @ts-expect-error orchestrator runtime was not requested
		void ctx.orchestrator;
	});
});
void _storeEnvironmentExtension;

const _curriedExtension = createExtension<[CoreAPI], []>()((api) => {
	api.on('cancel', () => {});
	// @ts-expect-error store API was not requested
	void api.registerStore;
});
void _curriedExtension;

const _duplicateAPI = createExtension<[CoreAPI, CoreAPI], []>(
	// @ts-expect-error duplicate API keys should be rejected
	() => {},
);
void _duplicateAPI;

type RuntimeA = BaseRuntime & { readonly shared: string };
type RuntimeB = BaseRuntime & { readonly shared: number };

const _duplicateRuntime = createExtension<[], [RuntimeA, RuntimeB]>(
	// @ts-expect-error duplicate runtime extras should be rejected
	() => {},
);
void _duplicateRuntime;
