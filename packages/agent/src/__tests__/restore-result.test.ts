import { describe, expect, it } from 'vitest';
import type { AbsolutePath } from '@franklin/lib';
import { joinAbsolute, MemoryFilesystem } from '@franklin/lib';

import { createStorage } from '../storage/create-storage.js';
import { DEFAULT_SETTINGS_FILE } from '../storage/settings.js';
import type { FranklinSession } from '../types.js';
import { franklinSessionCodec } from '../app/session/codecs/index.js';

const APP_DIR = '/test/app' as AbsolutePath;

function createTestStorage(fs: MemoryFilesystem) {
	return createStorage<FranklinSession>(fs, APP_DIR, {
		sessionCodec: franklinSessionCodec,
	});
}

describe('Storage.restore aggregates issues without halting startup', () => {
	it('returns no issues when nothing is persisted yet', async () => {
		const fs = new MemoryFilesystem();
		const storage = createTestStorage(fs);

		const result = await storage.restore();
		expect(result.issues).toEqual([]);
	});

	it('surfaces a corrupt settings file and keeps startup going', async () => {
		const fs = new MemoryFilesystem();
		fs.seed(joinAbsolute(APP_DIR, DEFAULT_SETTINGS_FILE), '{not json');
		const storage = createTestStorage(fs);

		const result = await storage.restore();
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({ kind: 'corrupt-json' });
	});

	it('aggregates issues from multiple sources', async () => {
		const fs = new MemoryFilesystem();
		fs.seed(
			joinAbsolute(APP_DIR, DEFAULT_SETTINGS_FILE),
			JSON.stringify({ version: 999, data: {} }),
		);
		const storeDir = joinAbsolute(APP_DIR, 'store');
		fs.seedDir(storeDir);
		fs.seed(joinAbsolute(storeDir, 'bad.json'), 'garbage');
		const storage = createTestStorage(fs);

		const result = await storage.restore();
		expect(result.issues).toHaveLength(2);
		const kinds = result.issues.map((i) => i.kind).sort();
		expect(kinds).toEqual(['corrupt-json', 'version-ahead']);
	});

	it('minor schema evolution: partial settings on disk hydrate with defaults, no issues', async () => {
		// Simulates a user whose settings file predates a schema field addition.
		// The stored envelope omits `reasoning`; restore should fill it from
		// schema defaults without surfacing an issue.
		const fs = new MemoryFilesystem();
		fs.seed(
			joinAbsolute(APP_DIR, DEFAULT_SETTINGS_FILE),
			JSON.stringify({
				version: 1,
				data: {
					defaultLLMConfig: {
						provider: 'anthropic',
						model: 'claude-sonnet-4-5',
					},
				},
			}),
		);
		const storage = createTestStorage(fs);

		const result = await storage.restore();
		expect(result.issues).toEqual([]);
		expect(storage.settings.get()).toEqual({
			shareViewedReferencesByDefault: true,
			defaultLLMConfig: {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
				reasoning: 'medium',
			},
		});
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

		const storage = createTestStorage(fs);
		const result = await storage.restore();

		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({
			kind: 'corrupt-json',
			id: 'bad',
		});
		expect(storage.stores.get('good')).toBeDefined();
	});

	it('one malformed session entry does not load as raw state', async () => {
		const fs = new MemoryFilesystem();
		const sessionsDir = joinAbsolute(APP_DIR, 'sessions');
		fs.seedDir(sessionsDir);
		fs.seed(
			joinAbsolute(sessionsDir, 'root.json'),
			JSON.stringify({
				version: 1,
				data: {
					core: { messages: [], llmConfig: {}, usage: 'invalid' },
				},
			}),
		);
		const storage = createTestStorage(fs);

		const result = await storage.sessions.load();

		expect(result.values.size).toBe(0);
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({
			kind: 'schema-mismatch',
			id: 'root',
			version: 1,
		});
	});
});
