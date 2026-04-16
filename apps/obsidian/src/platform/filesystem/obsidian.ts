import type { AbsolutePath, Filesystem } from '@franklin/lib';
import type { Vault } from 'obsidian';

import { createObsidianPathPolicyFromVault } from './path-policy.js';
import { createVaultFilesystem } from './vault.js';

export function createObsidianFilesystem(
	vault: Vault,
	backupFs: Filesystem,
): Filesystem {
	const vaultFs = createVaultFilesystem(vault);
	const policy = createObsidianPathPolicyFromVault(vault);

	function fsForPath(p: AbsolutePath): Omit<Filesystem, 'resolve' | 'glob'> {
		return policy.classifyPath(p).kind === 'vault' ? vaultFs : backupFs;
	}

	return {
		resolve: (...paths) => backupFs.resolve(...paths),
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
