import {
	mkdtemp,
	readFile,
	readdir,
	rm,
	stat,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebFetchResponse } from '@franklin/lib';
import { createHTTPReferenceCache } from '../factory.js';

function response(
	text = 'document',
	headers: Record<string, string> = {},
): WebFetchResponse {
	return {
		url: 'https://example.com/book.pdf',
		status: 200,
		statusText: 'OK',
		headers: { 'content-type': 'application/pdf', ...headers },
		body: new TextEncoder().encode(text),
	};
}

describe('HTTP reference disk cache', () => {
	let directory: string;
	let now: number;
	beforeEach(async () => {
		directory = await mkdtemp(join(tmpdir(), 'franklin-cache-'));
		now = Date.now();
		vi.spyOn(Date, 'now').mockImplementation(() => now);
	});
	afterEach(async () => {
		vi.restoreAllMocks();
		await rm(directory, { recursive: true, force: true });
	});

	it('reuses downloaded bytes after constructing a new cache instance', async () => {
		const load = vi.fn(async () => response());
		await createHTTPReferenceCache(directory).getOrLoad('url', load);
		const result = await createHTTPReferenceCache(directory).getOrLoad(
			'url',
			load,
		);
		expect(new TextDecoder().decode(result.body)).toBe('document');
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('downloads again after expiry', async () => {
		const cache = createHTTPReferenceCache(directory, { ttlMs: 1000 });
		const load = vi.fn(async () => response());
		await cache.getOrLoad('url', load);
		now += 1001;
		await cache.getOrLoad('url', load);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('does not retain HTTP errors or partial responses', async () => {
		const cache = createHTTPReferenceCache(directory);
		for (const status of [206, 404, 500]) {
			const load = vi.fn(async () => ({ ...response(), status }));
			await cache.getOrLoad(String(status), load);
			await cache.getOrLoad(String(status), load);
			expect(load).toHaveBeenCalledTimes(2);
		}
	});

	it('applies a reduced disk budget when reopening an existing cache', async () => {
		const load = vi.fn(async () => response());
		await createHTTPReferenceCache(directory).getOrLoad('url', load);
		await createHTTPReferenceCache(directory, { maxBytes: 1 }).getOrLoad(
			'url',
			load,
		);
		expect(await readdir(directory)).toEqual([]);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('combines concurrent requests and retries failed downloads', async () => {
		const cache = createHTTPReferenceCache(directory);
		const failed = vi.fn(async () => {
			throw new Error('offline');
		});
		const results = await Promise.allSettled([
			cache.getOrLoad('url', failed),
			cache.getOrLoad('url', failed),
		]);
		expect(results.map((result) => result.status)).toEqual([
			'rejected',
			'rejected',
		]);
		expect(failed).toHaveBeenCalledTimes(1);
		const load = vi.fn(async () => response());
		await Promise.all([
			cache.getOrLoad('url', load),
			cache.getOrLoad('url', load),
		]);
		expect(load).toHaveBeenCalledTimes(1);
	});

	it.each<Record<string, string>>([
		{ 'cache-control': 'no-store' },
		{ 'cache-control': 'no-cache' },
		{ 'cache-control': 'max-age=0' },
		{ 'cache-control': 'max-age=-1' },
		{ pragma: 'no-cache' },
		{ expires: '0' },
		{ vary: 'Accept-Language' },
		{ 'set-cookie': 'session=private' },
	])('does not retain responses with %o', async (headers) => {
		const cache = createHTTPReferenceCache(directory);
		const load = vi.fn(async () => response('document', headers));
		await cache.getOrLoad('url', load);
		await cache.getOrLoad('url', load);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('uses a shorter server freshness lifetime, accounting for Age', async () => {
		const cache = createHTTPReferenceCache(directory);
		const load = vi.fn(async () =>
			response('document', { 'cache-control': 'max-age=60', age: '59' }),
		);
		await cache.getOrLoad('url', load);
		now += 1001;
		await cache.getOrLoad('url', load);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('accounts for server Age when using Expires', async () => {
		const cache = createHTTPReferenceCache(directory);
		const load = vi.fn(async () =>
			response('document', {
				date: new Date(now).toUTCString(),
				expires: new Date(now + 60_000).toUTCString(),
				age: '59',
			}),
		);
		await cache.getOrLoad('url', load);
		now += 2000;
		await cache.getOrLoad('url', load);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('ignores corrupt entries and replaces them with complete downloads', async () => {
		const cache = createHTTPReferenceCache(directory);
		const load = vi.fn(async () => response());
		await cache.getOrLoad('url', load);
		const [entry] = await readdir(directory);
		const path = join(directory, entry!);
		const bytes = await readFile(path);
		bytes[bytes.length - 1] = bytes[bytes.length - 1]! ^ 1;
		await writeFile(path, bytes);
		const result = await cache.getOrLoad('url', load);
		expect(new TextDecoder().decode(result.body)).toBe('document');
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('evicts the least recently used entry to stay within the disk budget', async () => {
		const cache = createHTTPReferenceCache(directory, { maxBytes: 2500 });
		const load = vi.fn(async () => response('x'.repeat(600)));
		await cache.getOrLoad('a', load);
		now += 1000;
		await cache.getOrLoad('b', load);
		now += 1000;
		await cache.getOrLoad('a', load);
		now += 1000;
		await cache.getOrLoad('c', load);
		await cache.getOrLoad('a', load);
		expect(load).toHaveBeenCalledTimes(3);
		await cache.getOrLoad('b', load);
		expect(load).toHaveBeenCalledTimes(4);
		const entries = await readdir(directory);
		const sizes = await Promise.all(
			entries.map(async (entry) => (await stat(join(directory, entry))).size),
		);
		expect(sizes.reduce((sum, size) => sum + size, 0)).toBeLessThanOrEqual(
			2500,
		);
	});

	it('returns the download when storage is unavailable or an entry exceeds the budget', async () => {
		const path = join(directory, 'file');
		await writeFile(path, 'not a directory');
		for (const cache of [
			createHTTPReferenceCache(path),
			createHTTPReferenceCache(directory, { maxBytes: 1 }),
		]) {
			const load = vi.fn(async () => response());
			await expect(cache.getOrLoad('url', load)).resolves.toMatchObject({
				status: 200,
			});
			await cache.getOrLoad('url', load);
			expect(load).toHaveBeenCalledTimes(2);
		}
	});

	it('clears stored entries and prevents an older download from repopulating them', async () => {
		const cache = createHTTPReferenceCache(directory);
		const load = vi.fn(async () => response());
		await cache.getOrLoad('saved', load);
		const [entry] = await readdir(directory);
		await writeFile(join(directory, entry!), '');
		let signalStarted!: () => void;
		let complete!: (response: WebFetchResponse) => void;
		const started = new Promise<void>((resolve) => {
			signalStarted = resolve;
		});
		const downloading = new Promise<WebFetchResponse>((resolve) => {
			complete = resolve;
		});
		const pending = cache.getOrLoad('pending', () => {
			signalStarted();
			return downloading;
		});
		await started;
		await cache.clear();
		complete(response());
		await pending;
		expect(await readdir(directory)).toEqual([]);
		await cache.getOrLoad('saved', load);
		expect(load).toHaveBeenCalledTimes(2);
	});
});
