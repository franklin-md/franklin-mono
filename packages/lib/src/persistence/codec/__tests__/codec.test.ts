import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { rawCodec } from '../raw.js';
import { versioned } from '../versioned.js';
import { zodCodec } from '../zod.js';

describe('zodCodec', () => {
	const schema = z.object({ name: z.string(), count: z.number() });
	const codec = zodCodec(schema);

	it('encodes as identity', () => {
		const value = { name: 'a', count: 1 };
		expect(codec.encode(value)).toEqual(value);
	});

	it('decodes a valid value', () => {
		const raw = { name: 'a', count: 1 };
		expect(codec.decode(raw)).toEqual({ ok: true, value: raw });
	});

	it('returns schema-mismatch on invalid shape', () => {
		expect(codec.decode({ name: 'a', count: 'nope' })).toMatchObject({
			ok: false,
			issue: { kind: 'schema-mismatch' },
		});
	});
});

describe('rawCodec', () => {
	const codec = rawCodec<{ foo: string }>();

	it('is identity both ways', () => {
		const v = { foo: 'bar' };
		expect(codec.encode(v)).toEqual(v);
		expect(codec.decode(v)).toEqual({ ok: true, value: v });
	});
});

describe('versioned', () => {
	const V1 = z.object({ a: z.string() });
	const V2 = z.object({ a: z.string(), b: z.number() });
	const V3 = z.object({ fullName: z.string(), count: z.number() });

	it('v1-only: encode wraps with version, decode unwraps', () => {
		const codec = versioned().version(1, zodCodec(V1)).build();
		const encoded = codec.encode({ a: 'x' });
		expect(encoded).toEqual({ version: 1, data: { a: 'x' } });
		expect(codec.decode(encoded)).toEqual({ ok: true, value: { a: 'x' } });
	});

	it('envelope-invalid when no version field', () => {
		const codec = versioned().version(1, zodCodec(V1)).build();
		expect(codec.decode({ a: 'x' })).toMatchObject({
			ok: false,
			issue: { kind: 'envelope-invalid' },
		});
	});

	it('envelope-invalid when version is non-number', () => {
		const codec = versioned().version(1, zodCodec(V1)).build();
		expect(codec.decode({ version: 'one', data: { a: 'x' } })).toMatchObject({
			ok: false,
			issue: { kind: 'envelope-invalid' },
		});
	});

	it('version-ahead when disk version exceeds current', () => {
		const codec = versioned().version(1, zodCodec(V1)).build();
		expect(codec.decode({ version: 2, data: { a: 'x' } })).toEqual({
			ok: false,
			issue: { kind: 'version-ahead', version: 2, currentVersion: 1 },
		});
	});

	it('missing-migration when disk version is unknown in chain', () => {
		// Chain has v2 and v3 but not v1
		const codec = versioned()
			.version(2, zodCodec(V2))
			.version(3, zodCodec(V3), (prev: z.infer<typeof V2>) => ({
				fullName: prev.a,
				count: prev.b,
			}))
			.build();
		expect(codec.decode({ version: 1, data: { a: 'x' } })).toEqual({
			ok: false,
			issue: { kind: 'missing-migration', version: 1 },
		});
	});

	it('schema-mismatch when data does not match that version', () => {
		const codec = versioned().version(1, zodCodec(V1)).build();
		expect(codec.decode({ version: 1, data: { a: 42 } })).toMatchObject({
			ok: false,
			issue: { kind: 'schema-mismatch', version: 1 },
		});
	});

	it('migrates v1 data up to current v2', () => {
		const codec = versioned()
			.version(1, zodCodec(V1))
			.version(2, zodCodec(V2), (prev: z.infer<typeof V1>) => ({
				a: prev.a,
				b: 0,
			}))
			.build();
		expect(codec.decode({ version: 1, data: { a: 'hello' } })).toEqual({
			ok: true,
			value: { a: 'hello', b: 0 },
		});
	});

	it('walks migrations in order v1 -> v2 -> v3', () => {
		const codec = versioned()
			.version(1, zodCodec(V1))
			.version(2, zodCodec(V2), (prev: z.infer<typeof V1>) => ({
				a: prev.a,
				b: 10,
			}))
			.version(3, zodCodec(V3), (prev: z.infer<typeof V2>) => ({
				fullName: prev.a,
				count: prev.b,
			}))
			.build();
		expect(codec.decode({ version: 1, data: { a: 'n' } })).toEqual({
			ok: true,
			value: { fullName: 'n', count: 10 },
		});
	});

	it('encode always emits current version envelope', () => {
		const codec = versioned()
			.version(1, zodCodec(V1))
			.version(2, zodCodec(V2), (prev: z.infer<typeof V1>) => ({
				a: prev.a,
				b: 0,
			}))
			.build();
		expect(codec.encode({ a: 'x', b: 5 })).toEqual({
			version: 2,
			data: { a: 'x', b: 5 },
		});
	});

	it('re-validates after migration to catch buggy migrate', () => {
		// Buggy migrate returns wrong shape — should surface as schema-mismatch at current version.
		const buggyMigrate = (() => ({ a: 'x' })) as unknown as (
			prev: z.infer<typeof V1>,
		) => z.infer<typeof V2>;
		const codec = versioned()
			.version(1, zodCodec(V1))
			.version(2, zodCodec(V2), buggyMigrate)
			.build();
		expect(codec.decode({ version: 1, data: { a: 'n' } })).toMatchObject({
			ok: false,
			issue: { kind: 'schema-mismatch', version: 2 },
		});
	});
});
