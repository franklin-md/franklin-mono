import { spawnSync } from 'node:child_process';
import { resolve, sep } from 'node:path';

const OBSIDIAN_PLUGIN_MARKER = `${sep}.obsidian${sep}plugins${sep}`;

/**
 * Resolves the vault directory used to scope the Obsidian CLI reload command.
 *
 * @param {Pick<import('./cli.mjs').BuildArgs, 'vaultDir' | 'pluginDir'>} args
 * @returns {string | undefined}
 */
export function resolveReloadVaultDir({ vaultDir, pluginDir }) {
	if (vaultDir) return vaultDir;
	if (!pluginDir) return undefined;

	const resolvedPluginDir = resolve(pluginDir);
	const markerIndex = resolvedPluginDir.lastIndexOf(OBSIDIAN_PLUGIN_MARKER);
	if (markerIndex === -1) return undefined;

	return resolvedPluginDir.slice(0, markerIndex);
}

/**
 * Best-effort plugin reload via the Obsidian CLI.
 *
 * @param {Pick<import('./cli.mjs').BuildArgs, 'pluginDir' | 'pluginId' | 'vaultDir'>} args
 */
export function reloadPlugin(args) {
	if (!args.pluginDir) return;

	const resolvedVaultDir = resolveReloadVaultDir(args);
	if (!resolvedVaultDir) {
		warn(
			`Skipping plugin reload: could not determine the vault root from ${args.pluginDir}. Reload Franklin manually in Obsidian.`,
		);
		return;
	}

	const result = spawnSync(
		'obsidian',
		['plugin:reload', `id=${args.pluginId}`],
		{
			cwd: resolvedVaultDir,
			encoding: 'utf8',
		},
	);

	if (result.error) {
		warn(
			`Obsidian CLI reload failed: ${result.error.message}. Reload Franklin manually in Obsidian.`,
		);
		return;
	}

	if (result.status !== 0) {
		const detail =
			result.stderr.trim() ||
			result.stdout.trim() ||
			`command exited with code ${result.status}`;
		warn(
			`Obsidian CLI reload failed: ${detail}. Reload Franklin manually in Obsidian.`,
		);
		return;
	}

	console.log(`Reloaded Obsidian plugin "${args.pluginId}".`);
}

function warn(message) {
	console.warn(`[obsidian] ${message}`);
}
