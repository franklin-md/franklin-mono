import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonCodec, versioned, zodCodec } from '@franklin/lib';
import { z } from 'zod';
import { createStoreFixture } from './fixture.js';

const current = z.object({ count: z.number().nonnegative() });

afterEach(() => vi.useRealTimers());

describe('extension store migration failures', () => {
	it.each([
		{
			name: 'no legacy step',
			value: 7,
			schemaVersion: undefined,
			codec: versioned().version(1, zodCodec(current)).build(),
			error: 'missing-migration',
		},
		{
			name: 'unknown stored step',
			value: 7,
			schemaVersion: 1,
			codec: versioned()
				.version(0, zodCodec(z.number()))
				.version(2, zodCodec(current), (count) => ({ count }))
				.build(),
			error: 'missing-migration',
		},
		{
			name: 'future version',
			value: { count: 7 },
			schemaVersion: 9,
			codec: versioned().version(1, zodCodec(current)).build(),
			error: 'version-ahead',
		},
		{
			name: 'invalid source shape',
			value: 'bad',
			schemaVersion: undefined,
			codec: versioned()
				.version(0, zodCodec(z.number()))
				.version(1, zodCodec(current), (count) => ({ count }))
				.build(),
			error: 'schema-mismatch',
		},
		{
			name: 'invalid migration output',
			value: 7,
			schemaVersion: undefined,
			codec: versioned()
				.version(0, zodCodec(z.number()))
				.version(1, zodCodec(current), () => ({ count: -1 }))
				.build(),
			error: 'schema-mismatch',
		},
		{
			name: 'invalid current shape',
			value: { count: -1 },
			schemaVersion: 1,
			codec: versioned().version(1, zodCodec(current)).build(),
			error: 'schema-mismatch',
		},
		{
			name: 'malformed stored version',
			value: 7,
			schemaVersion: Number.NaN,
			codec: versioned()
				.version(0, zodCodec(z.number()))
				.version(1, zodCodec(current), (count) => ({ count }))
				.build(),
			error: 'non-negative safe integer',
		},
	])(
		'preserves the original file and live value on $name',
		async ({ value, schemaVersion, codec, error }) => {
			vi.useFakeTimers();
			const fixture = createStoreFixture(value, schemaVersion);
			await fixture.storage.restore();
			const entry = fixture.storage.stores.get(fixture.ref);
			await expect(
				fixture.compile(fixture.storage.stores, (api) => {
					api.registerStore('counter', { count: 0 }, 'private', codec);
				}),
			).rejects.toThrow(
				new RegExp(`Store "counter".*${fixture.ref}.*${error}`),
			);

			await vi.runAllTimersAsync();
			expect(await fixture.read()).toBe(fixture.original);
			expect(entry.store.get()).toEqual(value);
			expect(entry.sharing).toBe('shared');
			expect(entry.codec).toBeUndefined();
		},
	);

	it('isolates a migration that mutates its input and throws, then allows retry', async () => {
		const fixture = createStoreFixture({ count: 7 });
		await fixture.storage.restore();
		const codec = versioned()
			.version(0, jsonCodec<{ count: number }>())
			.version(1, zodCodec(current), (previous) => {
				previous.count = 99;
				throw new Error('conversion failed');
			})
			.build();

		await expect(
			fixture.compile(fixture.storage.stores, (api) => {
				api.registerStore('counter', { count: 0 }, 'shared', codec);
			}),
		).rejects.toThrow('conversion failed');
		expect(fixture.storage.stores.get(fixture.ref).store.get()).toEqual({
			count: 7,
		});
		expect(await fixture.read()).toBe(fixture.original);

		const fixed = versioned()
			.version(0, zodCodec(current))
			.version(1, zodCodec(current), (value) => value)
			.build();
		const runtime = await fixture.compile(fixture.storage.stores, (api) => {
			api.registerStore('counter', { count: 0 }, 'shared', fixed);
		});
		expect(runtime.getStore('counter').get()).toEqual({ count: 7 });
	});

	it('rejects missing codecs for versioned data instead of treating it as unversioned', async () => {
		const fixture = createStoreFixture({ count: 7 }, 1);
		await fixture.storage.restore();
		await expect(
			fixture.compile(fixture.storage.stores, (api) => {
				api.registerStore('counter', {}, 'shared');
			}),
		).rejects.toThrow('removing versioning is unsupported');
		expect(await fixture.read()).toBe(fixture.original);
	});

	it('keeps the live entry unchanged when the upgrade write rejects', async () => {
		const fixture = createStoreFixture(7);
		await fixture.storage.restore();
		const write = vi
			.spyOn(fixture.fs, 'writeFile')
			.mockRejectedValueOnce(new Error('disk full'));
		const codec = versioned()
			.version(0, zodCodec(z.number()))
			.version(1, zodCodec(current), (count) => ({ count }))
			.build();

		await expect(
			fixture.compile(fixture.storage.stores, (api) => {
				api.registerStore('counter', { count: 0 }, 'private', codec);
			}),
		).rejects.toThrow('disk full');
		expect(write).toHaveBeenCalledOnce();
		expect(fixture.storage.stores.get(fixture.ref)).toMatchObject({
			sharing: 'shared',
			schemaVersion: undefined,
		});
		expect(fixture.storage.stores.get(fixture.ref).store.get()).toBe(7);
		expect(await fixture.read()).toBe(fixture.original);
	});

	it('validates fresh initial data at the current schema without running migrations', async () => {
		const fixture = createStoreFixture();
		const migrate = vi.fn((count: number) => ({ count }));
		const codec = versioned()
			.version(0, zodCodec(z.number()))
			.version(1, zodCodec(current), migrate)
			.build();
		await expect(
			fixture.compile(fixture.storage.stores, (api) => {
				api.registerStore('counter', { count: -1 }, 'shared', codec);
			}),
		).rejects.toThrow('schema-mismatch');
		expect(migrate).not.toHaveBeenCalled();
		expect(await fixture.fs.exists(fixture.path)).toBe(false);
	});
});
