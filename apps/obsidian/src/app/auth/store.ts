import { createPersistedStore, createStore } from '@franklin/extensions';
import type { AuthEntries, AuthStore } from '@franklin/agent/browser';
import { readEntry, tombstoneEntry, writeEntry } from './entry-storage.js';
import { readIndex, writeIndex } from './index-storage.js';
import type { ObsidianSecretStorage } from './types.js';

const DEFAULTS: AuthEntries = {};

export function createObsidianAuthStore(
	secretStorage: ObsidianSecretStorage,
): AuthStore {
	return createPersistedStore(createStore(DEFAULTS), {
		restore() {
			const providers = readIndex(secretStorage);
			const value: AuthEntries = {};
			for (const provider of providers) {
				const entry = readEntry(secretStorage, provider);
				if (entry !== null) value[provider] = entry;
			}
			return Promise.resolve({ value, issues: [] });
		},
		persist(next) {
			const prev = readIndex(secretStorage);
			const nextProviders = Object.keys(next);

			for (const provider of prev) {
				if (!nextProviders.includes(provider)) {
					tombstoneEntry(secretStorage, provider);
				}
			}
			for (const [provider, entry] of Object.entries(next)) {
				writeEntry(secretStorage, provider, entry);
			}

			writeIndex(secretStorage, nextProviders);
			return Promise.resolve();
		},
		isEqual(left: AuthEntries, right: AuthEntries): boolean {
			return JSON.stringify(left) === JSON.stringify(right);
		},
	});
}
