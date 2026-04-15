import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ARTIFACTS = ['main.js', 'styles.css', 'manifest.json'];

/**
 * Copies manifest.json into dist/ and optionally syncs all artifacts
 * to an Obsidian vault plugin directory.
 *
 * @param {import('./cli.mjs').BuildArgs} args
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
