import { context } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const isWatch = process.argv.includes('--watch');
const pluginDirArg = process.argv.find((value) =>
	value.startsWith('--plugin-dir='),
);
const pluginDir = pluginDirArg?.slice('--plugin-dir='.length);

const rootDir = import.meta.dirname;
const distDir = resolve(rootDir, 'dist');

function copyStaticFiles(targetDir) {
	mkdirSync(targetDir, { recursive: true });
	cpSync(
		resolve(rootDir, 'manifest.json'),
		resolve(targetDir, 'manifest.json'),
		{ force: true },
	);
	cpSync(resolve(rootDir, 'styles.css'), resolve(targetDir, 'styles.css'), {
		force: true,
	});
}

function syncToVault() {
	if (!pluginDir) {
		return;
	}

	copyStaticFiles(pluginDir);
	cpSync(resolve(distDir, 'main.js'), resolve(pluginDir, 'main.js'), {
		force: true,
	});
}

const buildOptions = {
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
			name: 'copy-obsidian-assets',
			setup(build) {
				build.onEnd((result) => {
					if (result.errors.length > 0) {
						return;
					}

					copyStaticFiles(distDir);
					syncToVault();
				});
			},
		},
	],
};

const buildContext = await context(buildOptions);

if (isWatch) {
	await buildContext.watch();
	console.log('Watching Obsidian bundle for changes');
} else {
	await buildContext.rebuild();
	await buildContext.dispose();
}
