import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * @typedef {object} BuildArgs
 * @property {string}  rootDir   — package root (apps/obsidian)
 * @property {string}  srcDir    — source directory
 * @property {string}  distDir   — output directory
 * @property {boolean} isWatch   — true when --watch is passed
 * @property {boolean} isProd    — true when --prod is passed
 * @property {string}  [pluginDir] — resolved Obsidian vault plugin directory
 */

/**
 * Parses CLI flags and resolves all paths needed by the build pipeline.
 *
 * @returns {BuildArgs}
 */
export function parseBuildArgs() {
	const rootDir = resolve(import.meta.dirname, '..');
	const srcDir = resolve(rootDir, 'src');
	const distDir = resolve(rootDir, 'dist');
	const isWatch = process.argv.includes('--watch');
	const isProd = process.argv.includes('--prod');

	const vaultDirArg = process.argv.find((v) => v.startsWith('--vault-dir='));
	const vaultDir = vaultDirArg?.slice('--vault-dir='.length);

	const pluginDirArg = process.argv.find((v) => v.startsWith('--plugin-dir='));
	const pluginDirExplicit = pluginDirArg?.slice('--plugin-dir='.length);

	const pluginDir = resolvePluginDir({ rootDir, vaultDir, pluginDirExplicit });

	return { rootDir, srcDir, distDir, isWatch, isProd, pluginDir };
}

/**
 * Resolves the plugin directory from CLI args.
 * --plugin-dir takes precedence; --vault-dir derives it from manifest.id.
 */
function resolvePluginDir({ rootDir, vaultDir, pluginDirExplicit }) {
	if (pluginDirExplicit) return pluginDirExplicit;
	if (!vaultDir) return undefined;

	const manifest = JSON.parse(
		readFileSync(resolve(rootDir, 'manifest.json'), 'utf-8'),
	);
	return resolve(vaultDir, '.obsidian', 'plugins', manifest.id);
}
