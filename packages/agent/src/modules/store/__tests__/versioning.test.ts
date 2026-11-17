import { describe, expect, it, vi } from 'vitest';
import { joinAbsolute, versioned, zodCodec } from '@franklin/lib';
import { z } from 'zod';
import { createStoreFixture } from './fixture.js';
import type { StoreAPI } from '../api/api.js';

describe('extension store versioning', () => {
	it('leaves unversioned data unvalidated and uninterpreted', async () => {
		const value = { version: 999, data: 'ordinary extension data' };
		const fixture = createStoreFixture(value);
		await fixture.storage.restore();
		const runtime = await fixture.compile(fixture.storage.stores, (api) => {
			api.registerStore('counter', 0, 'shared');
		});

		expect(runtime.getStore('counter').get()).toEqual(value);
		expect(await fixture.read()).toBe(fixture.original);
	});

	it('upgrades unversioned data before exposing it and persists without waiting for debounce', async () => {
		const fixture = createStoreFixture(7);
		await fixture.storage.restore();
		const handle = fixture.storage.stores.get(fixture.ref).store;
		const migrate = vi.fn((count: number) => ({ count }));
		const codec = versioned()
			.version(0, zodCodec(z.number()))
			.version(1, zodCodec(z.object({ count: z.number() })), migrate)
			.build();
		const extension = (api: StoreAPI) => {
			api.registerStore('counter', { count: 0 }, 'shared', codec);
		};

		const runtime = await fixture.compile(fixture.storage.stores, extension);

		expect(runtime.getStore('counter')).toBe(handle);
		expect(handle.get()).toEqual({ count: 7 });
		expect(JSON.parse(await fixture.read())).toEqual({
			version: 1,
			data: {
				ref: fixture.ref,
				sharing: 'shared',
				schemaVersion: 1,
				value: { count: 7 },
			},
		});
		const restored = fixture.open();
		await restored.restore();
		const again = await fixture.compile(restored.stores, extension);
		expect(again.getStore('counter').get()).toEqual({ count: 7 });
		expect(migrate).toHaveBeenCalledExactlyOnceWith(7);
	});

	it('walks the declared chain in order and skips migrations for current data', async () => {
		const first = vi.fn((count: number) => ({ count }));
		const second = vi.fn((previous: { count: number }) => ({
			total: previous.count + 1,
		}));
		const codec = versioned()
			.version(0, zodCodec(z.number()))
			.version(1, zodCodec(z.object({ count: z.number() })), first)
			.version(2, zodCodec(z.object({ total: z.number() })), second)
			.build();
		const fixture = createStoreFixture(4);
		await fixture.storage.restore();
		const runtime = await fixture.compile(fixture.storage.stores, (api) => {
			api.registerStore('counter', { total: 0 }, 'shared', codec);
		});
		expect(runtime.getStore('counter').get()).toEqual({ total: 5 });
		expect(first).toHaveBeenCalledExactlyOnceWith(4);
		expect(second).toHaveBeenCalledExactlyOnceWith({ count: 4 });

		const current = createStoreFixture({ total: 12 }, 2);
		await current.storage.restore();
		const currentRuntime = await current.compile(
			current.storage.stores,
			(api) => {
				api.registerStore('counter', { total: 0 }, 'shared', codec);
			},
		);
		expect(currentRuntime.getStore('counter').get()).toEqual({ total: 12 });
		expect(await current.read()).toBe(current.original);
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});

	it('withholds the migrated value and runtime until the upgrade write completes', async () => {
		const fixture = createStoreFixture(7);
		await fixture.storage.restore();
		const codec = versioned()
			.version(0, zodCodec(z.number()))
			.version(1, zodCodec(z.object({ count: z.number() })), (count) => ({
				count,
			}))
			.build();
		let release = () => {};
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const writeFile = fixture.fs.writeFile.bind(fixture.fs);
		const writes = vi
			.spyOn(fixture.fs, 'writeFile')
			.mockImplementationOnce(async (path, content) => {
				await gate;
				await writeFile(path, content);
			});
		let exposed = false;
		const compiling = fixture
			.compile(fixture.storage.stores, (api) => {
				api.registerStore('counter', { count: 0 }, 'shared', codec);
			})
			.then((runtime) => {
				exposed = true;
				return runtime;
			});
		await vi.waitFor(() => {
			expect(writes).toHaveBeenCalledOnce();
		});
		expect(exposed).toBe(false);
		expect(fixture.storage.stores.get(fixture.ref).store.get()).toBe(7);
		expect(await fixture.read()).toBe(fixture.original);
		release();
		const runtime = await compiling;
		expect(exposed).toBe(true);
		expect(runtime.getStore('counter').get()).toEqual({ count: 7 });
	});
	it('awaits both upgrade writes when different references initialize concurrently', async () => {
		const fixture = createStoreFixture(7);
		const secondPath = joinAbsolute(fixture.appDir, 'store', 'second.json');
		fixture.fs.seed(
			secondPath,
			JSON.stringify({
				version: 1,
				data: { ref: 'second', sharing: 'shared', value: 9 },
			}),
		);
		await fixture.storage.restore();
		const codec = versioned()
			.version(0, zodCodec(z.number()))
			.version(1, zodCodec(z.object({ count: z.number() })), (count) => ({
				count,
			}))
			.build();
		let release = () => {};
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const writeFile = fixture.fs.writeFile.bind(fixture.fs);
		const writes = vi
			.spyOn(fixture.fs, 'writeFile')
			.mockImplementation(async (path, content) => {
				await gate;
				await writeFile(path, content);
			});
		const extension = (api: StoreAPI) =>
			api.registerStore('counter', { count: 0 }, 'shared', codec);
		const exposed: string[] = [];
		const compiling = [
			fixture.compile(fixture.storage.stores, extension).then(() => {
				exposed.push('first');
			}),
			fixture
				.compile(fixture.storage.stores, extension, { counter: 'second' })
				.then(() => {
					exposed.push('second');
				}),
		];
		await vi.waitFor(() => {
			expect(writes).toHaveBeenCalledTimes(2);
		});
		expect(exposed).toEqual([]);
		release();
		await Promise.all(compiling);
		expect(exposed).toHaveLength(2);
		expect(fixture.storage.stores.get('second').store.get()).toEqual({
			count: 9,
		});
	});
});
