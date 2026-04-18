import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { joinAbsolute, toAbsolutePath } from '../../../paths/index.js';
import { versioned } from '../../codec/versioned.js';
import { zodCodec } from '../../codec/zod.js';
import { createMapFilePersister } from '../create.js';
import { MemoryFilesystem } from '../../../filesystem/memory.js';

const ITEM = z.object({ title: z.string() });

const DIR = toAbsolutePath('/app/sessions');

function codec() {
	return versioned().version(1, zodCodec(ITEM)).build();
}

describe('MapFilePersister', () => {
	it('load returns empty map + no issues when dir is missing', async () => {
		const fs = new MemoryFilesystem();
		const p = createMapFilePersister(fs, DIR, codec());

		const result = await p.load();
		expect(result.values.size).toBe(0);
		expect(result.issues).toEqual([]);
	});

	it('save creates the directory and writes envelope', async () => {
		const fs = new MemoryFilesystem();
		const p = createMapFilePersister(fs, DIR, codec());

		await p.save('s1', { title: 'one' });
		const raw = JSON.parse(
			new TextDecoder().decode(await fs.readFile(joinAbsolute(DIR, 's1.json'))),
		);
		expect(raw).toEqual({ version: 1, data: { title: 'one' } });
	});

	it('save + load roundtrips multiple entries', async () => {
		const fs = new MemoryFilesystem();
		const p = createMapFilePersister(fs, DIR, codec());

		await p.save('s1', { title: 'one' });
		await p.save('s2', { title: 'two' });

		const result = await p.load();
		expect(result.issues).toEqual([]);
		expect(result.values.size).toBe(2);
		expect(result.values.get('s1')).toEqual({ title: 'one' });
		expect(result.values.get('s2')).toEqual({ title: 'two' });
	});

	it('partial failure: one corrupt file does not abort the rest', async () => {
		const fs = new MemoryFilesystem();
		await fs.mkdir(DIR, { recursive: true });
		fs.seed(
			joinAbsolute(DIR, 's1.json'),
			JSON.stringify({ version: 1, data: { title: 'one' } }),
		);
		fs.seed(joinAbsolute(DIR, 's2.json'), '{not json');
		fs.seed(
			joinAbsolute(DIR, 's3.json'),
			JSON.stringify({ version: 1, data: { title: 'three' } }),
		);
		const p = createMapFilePersister(fs, DIR, codec());

		const result = await p.load();
		expect(result.values.size).toBe(2);
		expect(result.values.get('s1')).toEqual({ title: 'one' });
		expect(result.values.get('s3')).toEqual({ title: 'three' });
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({
			kind: 'corrupt-json',
			id: 's2',
		});
	});

	it('schema-mismatch issue includes the id', async () => {
		const fs = new MemoryFilesystem();
		await fs.mkdir(DIR, { recursive: true });
		fs.seed(
			joinAbsolute(DIR, 'bad.json'),
			JSON.stringify({ version: 1, data: { title: 99 } }),
		);
		const p = createMapFilePersister(fs, DIR, codec());

		const result = await p.load();
		expect(result.values.size).toBe(0);
		expect(result.issues[0]).toMatchObject({
			kind: 'schema-mismatch',
			id: 'bad',
			version: 1,
		});
	});

	it('delete removes a single entry', async () => {
		const fs = new MemoryFilesystem();
		const p = createMapFilePersister(fs, DIR, codec());
		await p.save('s1', { title: 'one' });
		await p.save('s2', { title: 'two' });

		await p.delete('s1');

		const result = await p.load();
		expect(result.values.size).toBe(1);
		expect(result.values.has('s2')).toBe(true);
	});

	it('delete on missing entry does not throw', async () => {
		const fs = new MemoryFilesystem();
		const p = createMapFilePersister(fs, DIR, codec());
		await expect(p.delete('nope')).resolves.toBeUndefined();
	});

	it('ignores non-.json files in the dir', async () => {
		const fs = new MemoryFilesystem();
		await fs.mkdir(DIR, { recursive: true });
		fs.seed(joinAbsolute(DIR, 'README.md'), 'hello');
		fs.seed(
			joinAbsolute(DIR, 's1.json'),
			JSON.stringify({ version: 1, data: { title: 'one' } }),
		);
		const p = createMapFilePersister(fs, DIR, codec());

		const result = await p.load();
		expect(result.values.size).toBe(1);
		expect(result.issues).toEqual([]);
	});
});
