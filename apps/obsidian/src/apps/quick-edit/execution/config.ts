import type { App } from 'obsidian';
import type { EnvironmentConfig } from '@franklin/agent';
import { joinAbsolute, toAbsolutePath } from '@franklin/lib';
import { getVaultAbsolutePath } from '../../../shared/obsidian/path.js';
import { createDefaultObsidianFilesystemPermissions } from '../../../shared/obsidian/filesystem/permissions.js';

export function quickEditEnvironment(
	app: App,
	path: string,
): EnvironmentConfig {
	const root = toAbsolutePath(getVaultAbsolutePath(app.vault));
	const absolute = joinAbsolute(root, path);
	if (/[\r\n]/.test(absolute))
		throw new Error('Quick edit cannot target a filename containing a newline');
	// Filesystem permissions use gitignore patterns. Escape note-name syntax so
	// bracketed titles and literal wildcards cannot widen or break the write scope.
	const target = absolute.slice(1).replace(/([\\*?[\]#! ])/g, '\\$1');
	return {
		fsConfig: {
			cwd: root,
			permissions: {
				...createDefaultObsidianFilesystemPermissions(
					root,
					app.vault.configDir,
				),
				allowWrite: [target],
			},
		},
		netConfig: { allowedDomains: [], deniedDomains: [] },
	};
}
