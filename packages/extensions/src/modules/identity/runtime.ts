import type { BaseRuntime } from '../../algebra/runtime/types.js';
import type { StateHandle } from '../../algebra/runtime/types.js';
import type { IdentityState } from './state.js';

export type IdentityRuntime = BaseRuntime;

const EMPTY_HANDLE: StateHandle<IdentityState> = {
	async get(): Promise<IdentityState> {
		return {};
	},
	async fork(): Promise<IdentityState> {
		return {};
	},
	async child(): Promise<IdentityState> {
		return {};
	},
};

export function identityRuntime(): IdentityRuntime {
	return {
		async dispose(): Promise<void> {},
		subscribe(): () => void {
			return () => {};
		},
	};
}

export function identityStateHandle(): StateHandle<IdentityState> {
	return EMPTY_HANDLE;
}
