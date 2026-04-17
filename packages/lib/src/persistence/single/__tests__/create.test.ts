import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { toAbsolutePath } from '../../../paths/index.js';
import { versioned } from '../../codec/versioned.js';
import { zodCodec } from '../../codec/zod.js';
import { createSingleFilePersister } from '../create.js';
import { MemoryFilesystem } from '../../../filesystem/memory.js';

const SETTINGS_V1 = z.object({ theme: z.string() });
const SETTINGS_V2 = z.object({ theme: z.string(), font: z.string() });

const PATH = toAbsolutePath('/app/settings.json');

function v1Codec() {
	return versioned().version(1, zodCodec(SETTINGS_V1)).build();
}

describe('SingleFilePersister', () => {
	it('load returns undefined + no issues when file is missing', async () => {
		const fs = new MemoryFilesystem();
		const p = createSingleFilePersister(fs, PATH, v1Codec());

		const result = await p.load();
		expect(result.value).toBeUndefined();
		expect(result.issues).toEqual([]);
	});

	it('save + load roundtrips', async () => {
		const fs = new MemoryFilesystem();
		const p = createSingleFilePersister(fs, PATH, v1Codec());

		await p.save({ theme: 'dark' });
		const result = await p.load();
		expect(result.issues).toEqual([]);
		expect(result.value).toEqual({ theme: 'dark' });
	});

	it('save writes the versioned envelope', async () => {
		const fs = new MemoryFilesystem();
		const p = createSingleFilePersister(fs, PATH, v1Codec());

		await p.save({ theme: 'dark' });
		const raw = await fs.readFile(PATH);
		const parsed = JSON.parse(new TextDecoder().decode(raw));
		expect(parsed).toEqual({ version: 1, data: { theme: 'dark' } });
	});

	it('corrupt JSON surfaces as corrupt-json issue + undefined value', async () => {
		const fs = new MemoryFilesystem();
		fs.seed(PATH, '{not json');
		const p = createSingleFilePersister(fs, PATH, v1Codec());

		const result = await p.load();
		expect(result.value).toBeUndefined();
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({
			kind: 'corrupt-json',
			path: PATH,
		});
	});

	it('schema mismatch surfaces as schema-mismatch issue', async () => {
		const fs = new MemoryFilesystem();
		fs.seed(PATH, JSON.stringify({ version: 1, data: { theme: 42 } }));
		const p = createSingleFilePersister(fs, PATH, v1Codec());

		const result = await p.load();
		expect(result.value).toBeUndefined();
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({
			kind: 'schema-mismatch',
			path: PATH,
			version: 1,
		});
	});

	it('envelope without version field surfaces as envelope-invalid', async () => {
		const fs = new MemoryFilesystem();
		fs.seed(PATH, JSON.stringify({ theme: 'dark' }));
		const p = createSingleFilePersister(fs, PATH, v1Codec());

		const result = await p.load();
		expect(result.value).toBeUndefined();
		expect(result.issues[0]).toMatchObject({
			kind: 'envelope-invalid',
			path: PATH,
		});
	});

	it('migrates old version on read and upgrades on next save', async () => {
		const fs = new MemoryFilesystem();
		fs.seed(PATH, JSON.stringify({ version: 1, data: { theme: 'dark' } }));
		const codec = versioned()
			.version(1, zodCodec(SETTINGS_V1))
			.version(2, zodCodec(SETTINGS_V2), (prev) => ({
				theme: prev.theme,
				font: 'Inter',
			}))
			.build();
		const p = createSingleFilePersister(fs, PATH, codec);

		const loaded = await p.load();
		expect(loaded.issues).toEqual([]);
		expect(loaded.value).toEqual({ theme: 'dark', font: 'Inter' });

		if (loaded.value) await p.save(loaded.value);
		const raw = JSON.parse(new TextDecoder().decode(await fs.readFile(PATH)));
		expect(raw).toEqual({
			version: 2,
			data: { theme: 'dark', font: 'Inter' },
		});
	});

	it('delete removes the file', async () => {
		const fs = new MemoryFilesystem();
		const p = createSingleFilePersister(fs, PATH, v1Codec());
		await p.save({ theme: 'dark' });
		expect(fs.has(PATH)).toBe(true);
		await p.delete();
		expect(fs.has(PATH)).toBe(false);
	});

	it('delete on missing file does not throw', async () => {
		const fs = new MemoryFilesystem();
		const p = createSingleFilePersister(fs, PATH, v1Codec());
		await expect(p.delete()).resolves.toBeUndefined();
	});
});
