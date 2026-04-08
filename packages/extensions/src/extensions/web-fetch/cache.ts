import type { WebFetchResponse } from '@franklin/lib';
import type { Store } from '../../api/store/types.js';
import type {
	WebFetchCache,
	WebFetchCacheEntry,
	WebFetchExtensionOptions,
} from './types.js';

export function readFromCache(
	store: Store<WebFetchCache>,
	url: string,
	options: WebFetchExtensionOptions,
	now: number,
): WebFetchCacheEntry | undefined {
	let hit: WebFetchCacheEntry | undefined;

	store.set((draft) => {
		pruneDraft(draft, options, now);
		const entry = draft[url];
		if (!entry) return;

		entry.lastAccessedAt = now;
		hit = { ...entry };
	});

	return hit;
}

export function writeToCache(
	store: Store<WebFetchCache>,
	url: string,
	response: WebFetchResponse,
	options: WebFetchExtensionOptions,
	now: number,
): WebFetchCacheEntry {
	let cached!: WebFetchCacheEntry;

	store.set((draft) => {
		pruneDraft(draft, options, now);
		draft[url] = {
			...response,
			storedAt: now,
			expiresAt: now + options.cacheTtlMs,
			lastAccessedAt: now,
		} satisfies WebFetchCacheEntry;
		pruneDraft(draft, options, now);
		cached = { ...draft[url] };
	});

	return cached;
}

function pruneDraft(
	draft: WebFetchCache,
	options: WebFetchExtensionOptions,
	now: number,
): void {
	for (const [key, entry] of Object.entries(draft)) {
		if (entry.expiresAt <= now) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete draft[key];
		}
	}

	const entries = Object.entries(draft);
	if (entries.length <= options.cacheMaxEntries) {
		return;
	}

	entries
		.sort((a, b) => b[1].lastAccessedAt - a[1].lastAccessedAt)
		.slice(options.cacheMaxEntries)
		.forEach(([key]) => {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete draft[key];
		});
}
