import { describe, expect, it } from 'vitest';
import type { AbsolutePath } from '@franklin/lib';
import { joinAbsolute, MemoryFilesystem } from '@franklin/lib';

import { createStorage } from '../storage/create-storage.js';
import { DEFAULT_SETTINGS_FILE } from '../storage/settings.js';
import { DEFAULT_AUTH_FILE } from '../storage/auth.js';
import type { FranklinState } from '../types.js';

const APP_DIR = '/test/app' as AbsolutePath;

describe('Storage.restore aggregates issues without halting startup', () => {
	it('returns no issues when nothing is persisted yet', async () => {
		const fs = new MemoryFilesystem();
		const storage = createStorage<FranklinState>(fs, APP_DIR);

		const result = await storage.restore();
		expect(result.issues).toEqual([]);
	});

	it('surfaces a corrupt settings file and keeps startup going', async () => {
		const fs = new MemoryFilesystem();
		fs.seed(joinAbsolute(APP_DIR, DEFAULT_SETTINGS_FILE), '{not json');
		const storage = createStorage<FranklinState>(fs, APP_DIR);

		const result = await storage.restore();
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({ kind: 'corrupt-json' });
	});

	it('surfaces a schema-mismatch for malformed auth data', async () => {
		const fs = new MemoryFilesystem();
		fs.seed(
			joinAbsolute(APP_DIR, DEFAULT_AUTH_FILE),
			JSON.stringify({ version: 1, data: { anthropic: 'not-an-object' } }),
		);
		const storage = createStorage<FranklinState>(fs, APP_DIR);

		const result = await storage.restore();
		expect(result.issues[0]).toMatchObject({
			kind: 'schema-mismatch',
			version: 1,
		});
	});

	it('aggregates issues from multiple sources', async () => {
		const fs = new MemoryFilesystem();
		fs.seed(
			joinAbsolute(APP_DIR, DEFAULT_SETTINGS_FILE),
			JSON.stringify({ version: 999, data: {} }),
		);
		fs.seed(joinAbsolute(APP_DIR, DEFAULT_AUTH_FILE), 'garbage');
		const storage = createStorage<FranklinState>(fs, APP_DIR);

		const result = await storage.restore();
		expect(result.issues).toHaveLength(2);
		const kinds = result.issues.map((i) => i.kind).sort();
		expect(kinds).toEqual(['corrupt-json', 'version-ahead']);
	});

	it('one corrupt store entry does not abort restore of other entries', async () => {
		const fs = new MemoryFilesystem();
		const storeDir = joinAbsolute(APP_DIR, 'store');
		fs.seedDir(storeDir);
		fs.seed(
			joinAbsolute(storeDir, 'good.json'),
			JSON.stringify({
				version: 1,
				data: { ref: 'good', sharing: 'session', value: { n: 1 } },
			}),
		);
		fs.seed(joinAbsolute(storeDir, 'bad.json'), '{broken');

		const storage = createStorage<FranklinState>(fs, APP_DIR);
		const result = await storage.restore();

		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({
			kind: 'corrupt-json',
			id: 'bad',
		});
		expect(storage.stores.get('good')).toBeDefined();
	});
});
