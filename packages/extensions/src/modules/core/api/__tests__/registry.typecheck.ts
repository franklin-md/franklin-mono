import type { Registry } from '../../../../algebra/extension-points/registry.js';
import type { BaseRuntime } from '../../../../algebra/runtime/index.js';
import type {
	CoreAPI,
	CoreOnRegistration,
	CoreRegisterToolRegistration,
} from '../api.js';

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Expect<T extends true> = T;

type _CoreRegistryKeys = Expect<
	Equal<keyof Registry<CoreAPI, BaseRuntime>, 'on' | 'registerTool'>
>;

type _CoreRegistryOnEntries = Expect<
	Equal<
		Registry<CoreAPI, BaseRuntime>['on'][number],
		CoreOnRegistration<BaseRuntime>
	>
>;

type _CoreRegistryToolEntries = Expect<
	Equal<
		Registry<CoreAPI, BaseRuntime>['registerTool'][number],
		CoreRegisterToolRegistration<BaseRuntime>
	>
>;
