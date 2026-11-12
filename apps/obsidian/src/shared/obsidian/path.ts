import path from 'node:path';

import { FileSystemAdapter, normalizePath } from 'obsidian';
import type { PluginManifest, Vault } from 'obsidian';

export function getVaultAbsolutePath(vault: Vault): string {
	const adapter = vault.adapter;
	if (!(adapter instanceof FileSystemAdapter)) {
		throw new Error(
			'Obsidian platform requires FileSystemAdapter (desktop only)',
		);
	}
	return adapter.getBasePath();
}

export function getPluginAbsolutePath(
	vault: Vault,
	manifest: PluginManifest,
): string {
	const pluginDir = manifest.dir ?? `${vault.configDir}/plugins/${manifest.id}`;
	return path.resolve(getVaultAbsolutePath(vault), normalizePath(pluginDir));
}
