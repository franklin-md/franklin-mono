import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { reloadPlugin } from './reload.mjs';

const ARTIFACTS = ['main.js', 'styles.css', 'manifest.json'];

/**
 * Copies manifest.json into dist/ and syncs all artifacts
 * to an Obsidian vault plugin directory when configured.
 * A successful vault sync is followed by a best-effort plugin reload.
 *
 * @param {import('./cli.mjs').BuildArgs} args
 */
export function sync(args) {
	const { rootDir, distDir, pluginDir } = args;

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

	reloadPlugin(args);
}
