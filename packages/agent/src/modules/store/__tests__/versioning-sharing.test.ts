import { afterEach, describe, expect, it, vi } from 'vitest';
import { versioned, zodCodec } from '@franklin/lib';
import { z } from 'zod';
import type { StoreAPI } from '../api/api.js';
import { storeKey } from '../api/key.js';
import { storeMappingHandle } from '../runtime.js';
import { createStoreFixture } from './fixture.js';

afterEach(() => vi.useRealTimers());

describe('versioned store sharing and updates', () => {
	it('migrates one shared ref once even when two runtimes restore concurrently', async () => {
		const fixture = createStoreFixture(7);
		await fixture.storage.restore();
		const migrate = vi.fn((count: number) => ({ count }));
		const codec = versioned()
			.version(0, zodCodec(z.number()))
			.version(1, zodCodec(z.object({ count: z.number() })), migrate)
			.build();
		const extension = (api: StoreAPI) =>
			api.registerStore('counter', { count: 0 }, 'shared', codec);
		const [a, b] = await Promise.all([
			fixture.compile(fixture.storage.stores, extension),
			fixture.compile(fixture.storage.stores, extension),
		]);

		expect(a.getStore('counter')).toBe(b.getStore('counter'));
		expect(a.getStore('counter').get()).toEqual({ count: 7 });
		expect(migrate).toHaveBeenCalledOnce();
		expect(await storeMappingHandle(a).get()).toEqual({ counter: fixture.ref });
		expect(await storeMappingHandle(b).get()).toEqual({ counter: fixture.ref });
	});

	it('retains version metadata and shared identity across forks, children and disk restore', async () => {
		vi.useFakeTimers();
		const fixture = createStoreFixture();
		const migrate = vi.fn((count: number) => ({ count }));
		const codec = versioned()
			.version(0, zodCodec(z.number()))
			.version(1, zodCodec(z.object({ count: z.number() })), migrate)
			.build();
		const shared = storeKey<'shared', { count: number }>('shared');
		const privateKey = storeKey<'private', { count: number }>('private');
		const extension = (api: StoreAPI) => {
			api.registerStore(shared, { count: 0 }, 'shared', codec);
			api.registerStore(privateKey, { count: 0 }, 'private', codec);
		};
		const parent = await fixture.compile(fixture.storage.stores, extension);
		parent.getStore(shared).set((value) => {
			value.count = 3;
		});
		parent.getStore(privateKey).set((value) => {
			value.count = 9;
		});
		const parentMapping = await storeMappingHandle(parent).get();
		const forkMapping = await storeMappingHandle(parent).fork();
		const childMapping = await storeMappingHandle(parent).child();
		const fork = await fixture.compile(
			fixture.storage.stores,
			extension,
			forkMapping,
		);
		const child = await fixture.compile(
			fixture.storage.stores,
			extension,
			childMapping,
		);

		expect(fork.getStore(shared)).toBe(parent.getStore(shared));
		expect(child.getStore(shared)).toBe(parent.getStore(shared));
		expect(fork.getStore(privateKey)).not.toBe(parent.getStore(privateKey));
		expect(fork.getStore(privateKey).get()).toEqual({ count: 9 });
		expect(child.getStore(privateKey).get()).toEqual({ count: 0 });
		fork.getStore(privateKey).set((value) => {
			value.count = 10;
		});
		expect(parent.getStore(privateKey).get()).toEqual({ count: 9 });
		expect(migrate).not.toHaveBeenCalled();

		await vi.runAllTimersAsync();
		const restored = fixture.open();
		await restored.restore();
		const restoredParent = await fixture.compile(
			restored.stores,
			extension,
			parentMapping,
		);
		const restoredFork = await fixture.compile(
			restored.stores,
			extension,
			forkMapping,
		);
		expect(restoredFork.getStore(shared)).toBe(restoredParent.getStore(shared));
		expect(restoredParent.getStore(privateKey).get()).toEqual({ count: 9 });
		expect(restoredFork.getStore(privateKey).get()).toEqual({ count: 10 });
		for (const ref of Object.values(forkMapping)) {
			expect(restored.stores.get(ref).schemaVersion).toBe(1);
		}
		expect(migrate).not.toHaveBeenCalled();
	});

	it('requires restore to adopt a different schema for a live store', async () => {
		vi.useFakeTimers();
		const fixture = createStoreFixture(7);
		await fixture.storage.restore();
		const live = await fixture.compile(fixture.storage.stores, (api) => {
			api.registerStore('counter', 0, 'shared');
		});
		live.getStore<number>('counter').set(() => 8);
		const codec = versioned()
			.version(0, zodCodec(z.number()))
			.version(1, zodCodec(z.object({ count: z.number() })), (count) => ({
				count,
			}))
			.build();
		const extension = (api: StoreAPI) =>
			api.registerStore('counter', { count: 0 }, 'shared', codec);
		await expect(
			fixture.compile(fixture.storage.stores, extension),
		).rejects.toThrow('restore');
		expect(live.getStore('counter').get()).toBe(8);
		await vi.runAllTimersAsync();
		expect(JSON.parse(await fixture.read())).toMatchObject({
			data: { value: 8 },
		});
		const restored = fixture.open();
		await restored.restore();
		const upgraded = await fixture.compile(restored.stores, extension);
		expect(upgraded.getStore('counter').get()).toEqual({ count: 8 });
	});

	it('reuses ready stores without decoding or saving them again', async () => {
		const fixture = createStoreFixture(7);
		await fixture.storage.restore();
		const codec = versioned()
			.version(0, zodCodec(z.number()))
			.version(1, zodCodec(z.object({ count: z.number() })), (count) => ({
				count,
			}))
			.build();
		const decode = vi.spyOn(codec, 'decode');
		const extension = (api: StoreAPI) =>
			api.registerStore('counter', { count: 0 }, 'shared', codec);
		const parent = await fixture.compile(fixture.storage.stores, extension);
		const writes = vi.spyOn(fixture.fs, 'writeFile');
		const child = await fixture.compile(fixture.storage.stores, extension);
		expect(child.getStore('counter')).toBe(parent.getStore('counter'));
		expect(decode).toHaveBeenCalledOnce();
		expect(writes).not.toHaveBeenCalled();

		const equivalent = versioned()
			.version(1, zodCodec(z.object({ count: z.number() })))
			.build();
		const otherDecode = vi.spyOn(equivalent, 'decode');
		const another = await fixture.compile(fixture.storage.stores, (api) => {
			api.registerStore('counter', { count: 0 }, 'shared', equivalent);
		});
		expect(another.getStore('counter')).toBe(parent.getStore('counter'));
		expect(otherDecode).not.toHaveBeenCalled();
		expect(writes).not.toHaveBeenCalled();
		await expect(
			fixture.compile(fixture.storage.stores, (api) => {
				api.registerStore('counter', 0, 'shared');
			}),
		).rejects.toThrow('restore');
	});
});
