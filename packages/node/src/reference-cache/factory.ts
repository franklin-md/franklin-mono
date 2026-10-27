import { join } from 'node:path';
import type { HTTPReferenceCache } from '@franklin/agent';
import type { WebFetchResponse } from '@franklin/lib';
import { cacheExpiry } from './expiry.js';
import { cacheHash } from './hash.js';
import { pruneCache } from './prune.js';
import { readCachedResponse } from './read.js';
import { writeCachedResponse } from './write.js';

type Options = { ttlMs?: number; maxBytes?: number };

export function createHTTPReferenceCache(
	directory: string,
	{ ttlMs = 86_400_000, maxBytes = 512 * 1024 * 1024 }: Options = {},
): HTTPReferenceCache {
	if (
		!Number.isSafeInteger(ttlMs) ||
		ttlMs <= 0 ||
		!Number.isSafeInteger(maxBytes) ||
		maxBytes <= 0
	)
		throw new Error(
			'Cache lifetime and byte budget must be positive safe integers',
		);
	const pending = new Map<string, Promise<WebFetchResponse>>();
	let generation = 0;
	let queue = Promise.resolve();
	let initialized = false;
	// Different URLs download concurrently. Serialize only disk access so eviction,
	// reads and clear cannot race each other within this app-owned cache instance.
	function disk<T>(operation: () => Promise<T>): Promise<T> {
		const result = queue.then(operation);
		queue = result.then(
			() => {},
			() => {},
		);
		return result;
	}
	return {
		async getOrLoad(key, load) {
			const existing = pending.get(key);
			if (existing) return existing;
			const started = generation;
			const path = join(directory, `${cacheHash(key)}.cache`);
			const task = (async () => {
				const cached = await disk(async () => {
					if (!initialized) {
						await pruneCache(directory, maxBytes);
						initialized = true;
					}
					return readCachedResponse(path, maxBytes);
				}).catch(() => undefined);
				if (cached) return cached;
				const response = await load();
				const expiresAt = cacheExpiry(response, ttlMs);
				// Caching is an optimization. A full/unwritable disk must not turn a
				// successful document read into a failure, or retain failed transfers.
				if (expiresAt > Date.now())
					await disk(async () => {
						if (started === generation)
							await writeCachedResponse(
								directory,
								path,
								response,
								expiresAt,
								maxBytes,
							);
					}).catch(() => {});
				return response;
			})();
			pending.set(key, task);
			try {
				return await task;
			} finally {
				if (pending.get(key) === task) pending.delete(key);
			}
		},
		async clear() {
			generation += 1;
			pending.clear();
			await disk(() => pruneCache(directory, 0));
		},
	};
}
