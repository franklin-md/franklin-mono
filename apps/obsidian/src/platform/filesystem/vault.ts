import path from 'node:path';
import type { AbsolutePath, FileStat, Filesystem } from '@franklin/lib';
import { encode } from '@franklin/lib';
import { type FileManager, normalizePath, type Vault } from 'obsidian';

import { getVaultAbsolutePath } from '../../utils/obsidian/path.js';
import { isFile, isFolder } from '../../utils/obsidian/type-guards.js';

function toArrayBuffer(data: string | Uint8Array): ArrayBuffer {
	const bytes = typeof data === 'string' ? encode(data) : data;
	const copy = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(copy).set(bytes);
	return copy;
}

function toVaultPath(vaultRoot: string, absolutePath: AbsolutePath): string {
	return normalizePath(path.relative(vaultRoot, absolutePath));
}

function assertFilePath(vaultPath: string): string {
	if (vaultPath === '') throw new Error(`EISDIR: ${vaultPath}`);
	return vaultPath;
}

export type VaultFilesystem = Omit<Filesystem, 'resolve' | 'glob'>;

export function createVaultFilesystem(
	vault: Vault,
	fileManager: FileManager,
): VaultFilesystem {
	const vaultRoot = getVaultAbsolutePath(vault);

	return {
		async readFile(p) {
			const vaultPath = assertFilePath(toVaultPath(vaultRoot, p));
			const file = vault.getFileByPath(vaultPath);
			if (!file) throw new Error(`ENOENT: ${p}`);
			return new Uint8Array(await vault.readBinary(file));
		},

		async writeFile(p, content) {
			const vaultPath = assertFilePath(toVaultPath(vaultRoot, p));
			const existing = vault.getAbstractFileByPath(vaultPath);
			const data = toArrayBuffer(content);

			if (!existing) {
				await vault.createBinary(vaultPath, data);
				return;
			}

			if (!isFile(existing)) throw new Error(`EISDIR: ${p}`);
			await vault.modifyBinary(existing, data);
		},

		async mkdir(p, options) {
			const vaultPath = toVaultPath(vaultRoot, p);
			if (vaultPath === '') return;

			if (!options?.recursive) {
				await vault.createFolder(vaultPath);
				return;
			}

			const parts = vaultPath.split('/');
			let current = '';
			for (const part of parts) {
				current = current ? `${current}/${part}` : part;
				const existing = vault.getAbstractFileByPath(current);
				if (!existing) {
					await vault.createFolder(current);
					continue;
				}
				if (!isFolder(existing)) throw new Error(`ENOTDIR: ${current}`);
			}
		},

		async access(p) {
			if (!(await this.exists(p))) throw new Error(`ENOENT: ${p}`);
		},

		async stat(p): Promise<FileStat> {
			const vaultPath = toVaultPath(vaultRoot, p);
			if (vaultPath === '') {
				return { isFile: false, isDirectory: true };
			}

			const file = vault.getAbstractFileByPath(vaultPath);
			if (!file) throw new Error(`ENOENT: ${p}`);
			return {
				isFile: isFile(file),
				isDirectory: isFolder(file),
			};
		},

		async readdir(p) {
			const vaultPath = toVaultPath(vaultRoot, p);
			const folder =
				vaultPath === '' ? vault.getRoot() : vault.getFolderByPath(vaultPath);
			if (!folder) throw new Error(`ENOENT: ${p}`);
			return folder.children.map((child) => child.name);
		},

		async exists(p) {
			const vaultPath = toVaultPath(vaultRoot, p);
			if (vaultPath === '') return true;
			return vault.getAbstractFileByPath(vaultPath) !== null;
		},

		async deleteFile(p) {
			const vaultPath = assertFilePath(toVaultPath(vaultRoot, p));
			const file = vault.getAbstractFileByPath(vaultPath);
			if (!file) throw new Error(`ENOENT: ${p}`);
			if (!isFile(file)) throw new Error(`EISDIR: ${p}`);
			await fileManager.trashFile(file);
		},
	};
}
