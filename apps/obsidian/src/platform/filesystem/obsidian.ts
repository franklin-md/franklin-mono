import type { Filesystem } from '@franklin/lib';
import type { Vault } from 'obsidian';

import { createObsidianPathPolicyFromVault } from './path-policy.js';
import { createVaultFilesystem } from './vault.js';

export function createObsidianFilesystem(
	vault: Vault,
	backupFs: Filesystem,
): Filesystem {
	const vaultFs = createVaultFilesystem(vault);
	const policy = createObsidianPathPolicyFromVault(vault);

	function dispatch(absolutePath: string): {
		filesystem: Filesystem;
		path: string;
	} {
		const target = policy.classifyPath(absolutePath);
		return {
			filesystem: target.kind === 'vault' ? vaultFs : backupFs,
			path: target.path,
		};
	}

	return {
		async resolve(...paths) {
			return backupFs.resolve(...paths);
		},

		async readFile(path) {
			const target = dispatch(path);
			return target.filesystem.readFile(target.path);
		},

		async writeFile(path, content) {
			const target = dispatch(path);
			await target.filesystem.writeFile(target.path, content);
		},

		async mkdir(path, options) {
			const target = dispatch(path);
			await target.filesystem.mkdir(target.path, options);
		},

		async access(path) {
			const target = dispatch(path);
			await target.filesystem.access(target.path);
		},

		async stat(path) {
			const target = dispatch(path);
			return target.filesystem.stat(target.path);
		},

		async readdir(path) {
			const target = dispatch(path);
			return target.filesystem.readdir(target.path);
		},

		async exists(path) {
			const target = dispatch(path);
			return target.filesystem.exists(target.path);
		},

		async glob(pattern, options) {
			return backupFs.glob(pattern, options);
		},

		async deleteFile(path) {
			const target = dispatch(path);
			await target.filesystem.deleteFile(target.path);
		},
	};
}
