import { describe, expect, it } from 'vitest';
import { FileSystemAdapter } from 'obsidian';
import type { PluginManifest, Vault } from 'obsidian';

import {
	getPluginAbsolutePath,
	getVaultAbsolutePath,
} from '../utils/obsidian/path.js';

class MockFileSystemAdapter extends FileSystemAdapter {
	constructor(private readonly basePath: string) {
		super();
	}

	getBasePath(): string {
		return this.basePath;
	}
}

function createMockVault(basePath: string, configDir = '.obsidian'): Vault {
	return {
		adapter: new MockFileSystemAdapter(basePath),
		configDir,
	} as unknown as Vault;
}

describe('obsidian path helpers', () => {
	it('returns the vault base path from the filesystem adapter', () => {
		expect(getVaultAbsolutePath(createMockVault('/vault'))).toBe('/vault');
	});

	it('resolves the plugin directory from manifest.dir when available', () => {
		const manifest = {
			id: 'franklin',
			dir: '.obsidian/plugins/franklin',
		} as PluginManifest;

		expect(getPluginAbsolutePath(createMockVault('/vault'), manifest)).toBe(
			'/vault/.obsidian/plugins/franklin',
		);
	});

	it('falls back to the default plugin directory when manifest.dir is missing', () => {
		const manifest = {
			id: 'franklin',
		} as PluginManifest;

		expect(
			getPluginAbsolutePath(createMockVault('/vault', 'config'), manifest),
		).toBe('/vault/config/plugins/franklin');
	});
});
