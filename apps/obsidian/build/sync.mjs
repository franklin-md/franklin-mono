import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ARTIFACTS = ['main.js', 'styles.css', 'manifest.json'];

export function copyManifest(rootDir, distDir) {
	mkdirSync(distDir, { recursive: true });
	cpSync(resolve(rootDir, 'manifest.json'), resolve(distDir, 'manifest.json'), {
		force: true,
	});
}

export function syncToVault(distDir, pluginDir) {
	if (!pluginDir) {
		console.log(
			'No --vault-dir or --plugin-dir specified, skipping vault sync',
		);
		return;
	}
	console.log(`Syncing to vault plugin dir: ${pluginDir}`);
	mkdirSync(pluginDir, { recursive: true });
	for (const file of ARTIFACTS) {
		cpSync(resolve(distDir, file), resolve(pluginDir, file), { force: true });
		console.log(`  → ${file}`);
	}
}
