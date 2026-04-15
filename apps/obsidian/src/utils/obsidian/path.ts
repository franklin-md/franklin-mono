import { FileSystemAdapter, type Vault } from 'obsidian';

export function getVaultAbsolutePath(vault: Vault): string {
	const adapter = vault.adapter;
	if (!(adapter instanceof FileSystemAdapter)) {
		throw new Error(
			'Obsidian platform requires FileSystemAdapter (desktop only)',
		);
	}
	return adapter.getBasePath();
}
