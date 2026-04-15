import { watch } from 'node:fs';
import { resolve } from 'node:path';
import esbuild from 'esbuild';
import { createCssBuilder } from './css/build.mjs';
import { sync, resolvePluginDir } from './sync.mjs';

// ── Paths ───────────────────────────────────────────────────
const rootDir = resolve(import.meta.dirname, '..');
const distDir = resolve(rootDir, 'dist');
const srcDir = resolve(rootDir, 'src');

// ── CLI args ────────────────────────────────────────────────
const isWatch = process.argv.includes('--watch');

const vaultDirArg = process.argv.find((v) => v.startsWith('--vault-dir='));
const vaultDir = vaultDirArg?.slice('--vault-dir='.length);

const pluginDirArg = process.argv.find((v) => v.startsWith('--plugin-dir='));
const pluginDirExplicit = pluginDirArg?.slice('--plugin-dir='.length);

const pluginDir = resolvePluginDir({
	rootDir,
	vaultDir,
	pluginDir: pluginDirExplicit,
});

// ── JS build (esbuild) ─────────────────────────────────────
const esbuildOptions = {
	entryPoints: [resolve(srcDir, 'main.ts')],
	bundle: true,
	outfile: resolve(distDir, 'main.js'),
	format: 'cjs',
	platform: 'node',
	target: 'es2022',
	jsx: 'automatic',
	sourcemap: true,
	logLevel: 'info',
	external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*'],
};

async function buildJs() {
	await esbuild.build(esbuildOptions);
}

// ── CSS build (PostCSS + Tailwind) ──────────────────────────
const buildCss = createCssBuilder({ srcDir, distDir, isWatch });

// ── Sync ────────────────────────────────────────────────────
function runSync() {
	sync({ rootDir, distDir, pluginDir });
}

// ── Single build ────────────────────────────────────────────
if (!isWatch) {
	await Promise.all([buildJs(), buildCss()]);
	runSync();
	process.exit(0);
}

// ── Watch mode ──────────────────────────────────────────────
console.log('Starting watch mode…');

// JS: esbuild's native watcher
const ctx = await esbuild.context({
	...esbuildOptions,
	plugins: [
		{
			name: 'on-end',
			setup(build) {
				build.onEnd((result) => {
					if (result.errors.length === 0) runSync();
				});
			},
		},
	],
});
await ctx.watch();

// CSS: fs.watch on src/ (covers .ts/.tsx for Tailwind class scanning + .css changes)
let cssRebuildTimer;
watch(srcDir, { recursive: true }, (_event, filename) => {
	if (!filename) return;
	if (!/\.(ts|tsx|css)$/.test(filename)) return;

	// Debounce rapid changes
	clearTimeout(cssRebuildTimer);
	cssRebuildTimer = setTimeout(async () => {
		try {
			await buildCss();
			runSync();
			console.log('CSS rebuilt');
		} catch (err) {
			console.error('CSS build error:', err.message);
		}
	}, 100);
});

console.log('Watching for changes…');
