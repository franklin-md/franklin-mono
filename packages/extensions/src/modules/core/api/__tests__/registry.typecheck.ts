import type { TurnStart } from '@franklin/mini-acp';
import type { Registry } from '../../../../algebra/extension-points/registry.js';
import type { BaseRuntime } from '../../../../algebra/runtime/index.js';
import type {
	CoreAPI,
	CoreAPISurface,
	CoreEventHandlers,
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

type _CoreTurnStartHandler = CoreEventHandlers<BaseRuntime>['turnStart'];

const _turnStartHandler: _CoreTurnStartHandler = (event, runtime) => {
	const _event: TurnStart = event;
	const _runtime: BaseRuntime = runtime;
	void _event;
	void _runtime;
};

const _turnStartRegistration: CoreOnRegistration<BaseRuntime> = [
	'turnStart',
	_turnStartHandler,
];
void _turnStartRegistration;

const _api = null as unknown as CoreAPISurface<BaseRuntime>;
_api.on('turnStart', (event, runtime) => {
	const _event: TurnStart = event;
	const _runtime: BaseRuntime = runtime;
	void _event;
	void _runtime;
});
