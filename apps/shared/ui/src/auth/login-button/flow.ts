import type { OAuthLoginState } from '@franklin/react';

export function isOAuthFlowRunning(state: OAuthLoginState): boolean {
	return (
		state.phase !== 'idle' &&
		state.phase !== 'success' &&
		state.phase !== 'error'
	);
}
