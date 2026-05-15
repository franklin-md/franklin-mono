import {
	identityModule as simpleIdentityModule,
	type IdentityAPI,
	type IdentityRuntime,
} from '../simple/identity.js';
import type {
	IdentityState,
	StateExtensionModule,
	StateHandle,
} from './types.js';

export type IdentityModule = StateExtensionModule<
	IdentityState,
	IdentityAPI,
	IdentityRuntime
>;

const EMPTY_STATE_HANDLE: StateHandle<IdentityState> = {
	async get() {
		return {};
	},
	async fork() {
		return {};
	},
	async child() {
		return {};
	},
};

export function identityState(): IdentityState {
	return {};
}

export function identityStateHandle(): StateHandle<IdentityState> {
	return EMPTY_STATE_HANDLE;
}

export function identityModule(): IdentityModule {
	return {
		emptyState: identityState,
		state: () => identityStateHandle(),
		instantiate: () => simpleIdentityModule(),
	};
}
