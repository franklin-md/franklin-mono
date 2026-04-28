import type { OAuthFlowState } from '@franklin/react';

export function isOAuthFlowRunning(state: OAuthFlowState): boolean {
	return (
		state.phase !== 'idle' &&
		state.phase !== 'success' &&
		state.phase !== 'error'
	);
}
