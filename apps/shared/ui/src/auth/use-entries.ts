import { useCallback } from 'react';

import type {
	ApiKeyEntry,
	AuthEntries,
	AuthEntry,
} from '@franklin/agent/browser';

import { useStableExternalStore } from '@franklin/react';

import { useAuthManager } from './context.js';

export type ApiKeyAuthEntry = [
	provider: string,
	entry: AuthEntry & {
		apiKey: ApiKeyEntry;
	},
];

export function useAuthEntries() {
	const auth = useAuthManager();

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			if (typeof auth.onAuthChange !== 'function') {
				return () => {};
			}

			return auth.onAuthChange(() => {
				onStoreChange();
			});
		},
		[auth],
	);

	const getSnapshot = useCallback((): AuthEntries => auth.entries(), [auth]);
	const entries = useStableExternalStore(subscribe, getSnapshot);

	const providerCount = Object.keys(entries).length;
	const apiKeyEntries = Object.entries(entries).filter(
		(entry): entry is ApiKeyAuthEntry => Boolean(entry[1].apiKey),
	);

	function isOAuthSignedIn(provider: string): boolean {
		return Boolean(entries[provider]?.oauth);
	}

	return {
		entries,
		providerCount,
		isSignedIn: providerCount > 0,
		apiKeyEntries,
		isOAuthSignedIn,
	};
}
