import type { TurnStart } from '@franklin/mini-acp';
import type {
	EffectName,
	EffectValueForName,
	Registry,
} from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type {
	CoreAPI,
	CoreEventHandlers,
	CoreOnRegistration,
	CoreRegisterToolRegistration,
	CoreSignature,
} from '../api.js';

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Expect<T extends true> = T;

type _CoreRegistryKeys = Expect<
	Equal<keyof Registry<CoreSignature, BaseRuntime>, 'effects'>
>;

type _CoreEffectNames = Expect<
	Equal<EffectName<CoreSignature, BaseRuntime>, 'on' | 'registerTool'>
>;

type _CoreRegistryOnEntries = Expect<
	Equal<
		EffectValueForName<CoreSignature, BaseRuntime, 'on'>,
		CoreOnRegistration<BaseRuntime>
	>
>;

type _CoreRegistryToolEntries = Expect<
	Equal<
		EffectValueForName<CoreSignature, BaseRuntime, 'registerTool'>,
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

const _api = null as unknown as CoreAPI<BaseRuntime>;
_api.on('turnStart', (event, runtime) => {
	const _event: TurnStart = event;
	const _runtime: BaseRuntime = runtime;
	void _event;
	void _runtime;
});
