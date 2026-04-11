import { context } from 'esbuild';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCSS, watchStyles } from './build/css.mjs';
import { copyManifest, syncToVault } from './build/sync.mjs';

const isWatch = process.argv.includes('--watch');
const vaultDirArg = process.argv.find((v) => v.startsWith('--vault-dir='));
const vaultDir = vaultDirArg?.slice('--vault-dir='.length);

const rootDir = import.meta.dirname;
const distDir = resolve(rootDir, 'dist');

const manifest = JSON.parse(
	readFileSync(resolve(rootDir, 'manifest.json'), 'utf-8'),
);
const pluginDir = vaultDir
	? resolve(vaultDir, '.obsidian', 'plugins', manifest.id)
	: undefined;

async function rebuild() {
	await buildCSS(rootDir, distDir);
	copyManifest(rootDir, distDir);
	syncToVault(distDir, pluginDir);
}

const buildContext = await context({
	entryPoints: [resolve(rootDir, 'src/main.ts')],
	bundle: true,
	format: 'cjs',
	platform: 'browser',
	target: 'es2022',
	outfile: resolve(distDir, 'main.js'),
	external: ['obsidian', '@codemirror/*', '@lezer/*'],
	sourcemap: true,
	logLevel: 'info',
	plugins: [
		{
			name: 'obsidian-assets',
			setup(build) {
				build.onEnd(async (result) => {
					if (result.errors.length > 0) {
						return;
					}
					await rebuild();
				});
			},
		},
	],
});

if (isWatch) {
	watchStyles(rootDir, async () => {
		try {
			await buildCSS(rootDir, distDir);
			syncToVault(distDir, pluginDir);
			console.log('CSS rebuilt (style change)');
		} catch (err) {
			console.error('CSS rebuild failed:', err.message);
		}
	});

	await buildContext.watch();
	console.log('Watching Obsidian bundle for changes');
} else {
	await buildContext.rebuild();
	await buildContext.dispose();
}
