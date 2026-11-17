import type { AbsolutePath, Filesystem } from '@franklin/lib';
import type { App } from 'obsidian';
import { createNoteLocatorResolver } from './note-locator/resolve.js';
import { createObsidianPathPolicyFromVault } from './path-policy.js';
import { createObsidianResolve } from './resolve.js';
import { createVaultFilesystem } from './vault.js';

export function createObsidianFilesystem(
	app: App,
	backupFs: Filesystem,
): Filesystem {
	const { fileManager, vault } = app;
	const vaultFs = createVaultFilesystem(vault, fileManager);
	const policy = createObsidianPathPolicyFromVault(vault);
	const resolve = createObsidianResolve(
		backupFs,
		createNoteLocatorResolver(app),
	);

	function fsForPath(p: AbsolutePath): Omit<Filesystem, 'resolve' | 'glob'> {
		return policy.classifyPath(p).kind === 'vault' ? vaultFs : backupFs;
	}

	return {
		resolve,
		glob: (pattern, options) => backupFs.glob(pattern, options),

		readFile: (p) => fsForPath(p).readFile(p),
		writeFile: (p, content) => fsForPath(p).writeFile(p, content),
		mkdir: (p, options) => fsForPath(p).mkdir(p, options),
		access: (p) => fsForPath(p).access(p),
		stat: (p) => fsForPath(p).stat(p),
		readdir: (p) => fsForPath(p).readdir(p),
		exists: (p) => fsForPath(p).exists(p),
		deleteFile: (p) => fsForPath(p).deleteFile(p),
	};
}
