import { resolve } from 'node:path';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MemoryFilesystem, toAbsolutePath } from '@franklin/lib';
import { FileSystemAdapter, type PluginManifest, type Vault } from 'obsidian';

let fs = new MemoryFilesystem();

vi.mock('@franklin/node', () => ({
	createNodeFilesystem: () => fs,
}));

import { ObsidianDiffClient } from '../diff-client.js';

const MANIFEST = { id: 'franklin' } as PluginManifest;
const VAULT_ROOT = '/vault';
const CACHE_PATH = toAbsolutePath(
	resolve(VAULT_ROOT, '.obsidian/plugins/franklin/diff-cache.json'),
);

describe('ObsidianDiffClient', () => {
	beforeEach(() => {
		fs = new MemoryFilesystem();
	});

	it('tracks newly created files as unopened until first open', async () => {
		const client = new ObsidianDiffClient(
			createMockVault(VAULT_ROOT),
			MANIFEST,
		);
		const notePath = toAbsolutePath('/vault/notes/new.md');

		fs.seed(notePath, 'fresh');
		client.onWrite(notePath, null, new TextEncoder().encode('fresh'));
		await flushAsyncWork();

		await expect(client.listUnopenedNewFiles()).resolves.toEqual([
			'notes/new.md',
		]);
		await expect(client.getEntry('notes/new.md')).resolves.toMatchObject({
			path: 'notes/new.md',
			oldContent: '',
			isNewFile: true,
		});

		await client.markOpened('notes/new.md');

		await expect(client.listUnopenedNewFiles()).resolves.toEqual([]);
		await expect(client.getEntry('notes/new.md')).resolves.toMatchObject({
			path: 'notes/new.md',
			oldContent: '',
			isNewFile: true,
		});

		await expect(readCacheFile()).resolves.toEqual({
			'/vault/notes/new.md': {
				baseline: null,
				unopenedNewFile: false,
			},
		});
	});

	it('loads legacy cache entries and preserves unopened new-file state', async () => {
		fs.seed(CACHE_PATH, JSON.stringify(createLegacyCacheFile(), null, 2));
		fs.seed(toAbsolutePath('/vault/notes/new.md'), 'fresh');
		fs.seed(toAbsolutePath('/vault/notes/existing.md'), 'after');

		const client = new ObsidianDiffClient(
			createMockVault(VAULT_ROOT),
			MANIFEST,
		);

		await expect(client.listUnopenedNewFiles()).resolves.toEqual([
			'notes/new.md',
		]);
		await expect(client.getEntry('notes/new.md')).resolves.toMatchObject({
			path: 'notes/new.md',
			oldContent: '',
			isNewFile: true,
		});
		await expect(client.getEntry('notes/existing.md')).resolves.toMatchObject({
			path: 'notes/existing.md',
			oldContent: 'before',
			isNewFile: false,
		});
	});
});

async function readCacheFile(): Promise<unknown> {
	return JSON.parse(new TextDecoder().decode(await fs.readFile(CACHE_PATH)));
}

function createLegacyCacheFile(): Record<string, string | null> {
	return {
		'/vault/notes/new.md': null,
		'/vault/notes/existing.md': encodeBase64('before'),
	};
}

function encodeBase64(value: string): string {
	return Buffer.from(value).toString('base64');
}

function createMockVault(basePath: string): Vault {
	const adapter = Object.create(
		FileSystemAdapter.prototype,
	) as FileSystemAdapter & {
		getBasePath(): string;
	};
	adapter.getBasePath = () => basePath;

	return {
		adapter,
		configDir: '.obsidian',
	} as unknown as Vault;
}

async function flushAsyncWork(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
}
