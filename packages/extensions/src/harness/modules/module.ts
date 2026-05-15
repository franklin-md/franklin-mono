import type { API } from '../../algebra/api/index.js';
import type {
	BaseState,
	BaseStateExtensionModule,
	StateExtensionModule,
} from '../../algebra/modules/state/index.js';
import type { BaseRuntime } from '../../algebra/runtime/index.js';

export type HarnessModule<
	S extends BaseState,
	A extends API,
	Runtime extends BaseRuntime & A['In'],
> = StateExtensionModule<S, A, Runtime>;

export type BaseHarnessModule = BaseStateExtensionModule;
