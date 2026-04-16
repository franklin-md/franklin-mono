import type { EmptyState } from './state.js';
import type { RuntimeBase } from '../../algebra/runtime/types.js';

export type EmptyRuntime = RuntimeBase<EmptyState>;

export function emptyRuntime(): EmptyRuntime {
	return {
		async state(): Promise<EmptyState> {
			return {};
		},
		async fork(): Promise<EmptyState> {
			return {};
		},
		async child(): Promise<EmptyState> {
			return {};
		},
		async dispose(): Promise<void> {},
		subscribe(): () => void {
			return () => {};
		},
	};
}
