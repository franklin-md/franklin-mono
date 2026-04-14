/** Minimal provider descriptor — id + display name. */
export type OAuthProviderMeta = { id: string; name: string };

export type FlowState =
	| { phase: 'idle' }
	| { phase: 'starting' }
	| { phase: 'in-progress'; message: string }
	| { phase: 'waiting' }
	| { phase: 'success' }
	| { phase: 'error'; message: string };
