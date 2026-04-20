import type { BaseRuntime } from '../../algebra/runtime/types.js';
import type { IdentityState } from './state.js';

export type IdentityRuntime = BaseRuntime<IdentityState>;

export function identityRuntime(): IdentityRuntime {
	return {
		async state(): Promise<IdentityState> {
			return {};
		},
		async fork(): Promise<IdentityState> {
			return {};
		},
		async child(): Promise<IdentityState> {
			return {};
		},
		async dispose(): Promise<void> {},
		subscribe(): () => void {
			return () => {};
		},
	};
}
