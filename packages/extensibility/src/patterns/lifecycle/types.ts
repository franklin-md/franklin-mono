import type { StaticSignature } from '../../api/types.js';
import type { MaybePromise } from '../../utils/maybe-promise.js';

export type LifecycleUnload = () => MaybePromise<void>;

export type LifecycleAPI = {
	onUnload(unload: LifecycleUnload): void;
};

export type LifecycleSignature = StaticSignature<LifecycleAPI>;
