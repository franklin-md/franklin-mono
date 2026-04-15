import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ARTIFACTS = ['main.js', 'styles.css', 'manifest.json'];

/**
 * Copies manifest.json into dist/ and optionally syncs all artifacts
 * to an Obsidian vault plugin directory.
 *
 * @param {{ rootDir: string, distDir: string, pluginDir?: string }} opts
 */
export function sync({ rootDir, distDir, pluginDir }) {
	mkdirSync(distDir, { recursive: true });
	cpSync(resolve(rootDir, 'manifest.json'), resolve(distDir, 'manifest.json'), {
		force: true,
	});

	if (!pluginDir) return;

	console.log(`Syncing to vault plugin dir: ${pluginDir}`);
	mkdirSync(pluginDir, { recursive: true });
	for (const file of ARTIFACTS) {
		cpSync(resolve(distDir, file), resolve(pluginDir, file), {
			force: true,
		});
		console.log(`  → ${file}`);
	}
}

/**
 * Resolves the plugin directory from CLI args.
 * --plugin-dir takes precedence over --vault-dir (which derives it from manifest.id).
 */
export function resolvePluginDir({ rootDir, vaultDir, pluginDir }) {
	if (pluginDir) return pluginDir;
	if (!vaultDir) return undefined;

	const manifest = JSON.parse(
		readFileSync(resolve(rootDir, 'manifest.json'), 'utf-8'),
	);
	return resolve(vaultDir, '.obsidian', 'plugins', manifest.id);
}
