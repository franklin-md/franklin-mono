import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ARTIFACTS = ['main.js', 'styles.css', 'manifest.json'];

/**
 * Vite plugin that copies manifest.json into dist/ after every build
 * and optionally syncs all artifacts to an Obsidian vault plugin directory.
 *
 * Vault/plugin dir is read from env vars set by build/bundle.mjs:
 *   OBSIDIAN_VAULT_DIR  — path to vault root (plugin dir derived from manifest.id)
 *   OBSIDIAN_PLUGIN_DIR — explicit plugin dir (takes precedence)
 */
export function obsidianSync() {
	const rootDir = resolve(import.meta.dirname, '..');
	const distDir = resolve(rootDir, 'dist');

	const manifest = JSON.parse(
		readFileSync(resolve(rootDir, 'manifest.json'), 'utf-8'),
	);

	const vaultDir = process.env.OBSIDIAN_VAULT_DIR;
	const pluginDir =
		process.env.OBSIDIAN_PLUGIN_DIR ??
		(vaultDir
			? resolve(vaultDir, '.obsidian', 'plugins', manifest.id)
			: undefined);

	return {
		name: 'obsidian-sync',
		writeBundle() {
			mkdirSync(distDir, { recursive: true });
			cpSync(
				resolve(rootDir, 'manifest.json'),
				resolve(distDir, 'manifest.json'),
				{ force: true },
			);

			if (!pluginDir) {
				console.log(
					'No --vault-dir or --plugin-dir specified, skipping vault sync',
				);
				return;
			}

			console.log(`Syncing to vault plugin dir: ${pluginDir}`);
			mkdirSync(pluginDir, { recursive: true });
			for (const file of ARTIFACTS) {
				cpSync(resolve(distDir, file), resolve(pluginDir, file), {
					force: true,
				});
				console.log(`  → ${file}`);
			}
		},
	};
}
