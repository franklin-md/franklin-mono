import path from 'node:path';

import { encode } from '@franklin/lib';
import type { Filesystem, FileStat } from '@franklin/lib';
import { type Vault, normalizePath } from 'obsidian';

import { isFile, isFolder } from '../../utils/obsidian/type-guards.js';

function toArrayBuffer(data: string | Uint8Array): ArrayBuffer {
	const bytes = typeof data === 'string' ? encode(data) : data;
	const copy = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(copy).set(bytes);
	return copy;
}

function assertFilePath(path: string): string {
	const normalized = normalizePath(path);
	if (normalized === '') throw new Error(`EISDIR: ${path}`);
	return normalized;
}

export function createVaultFilesystem(vault: Vault): Filesystem {
	return {
		async resolve(...paths) {
			return normalizePath(path.posix.join(...paths));
		},

		async readFile(path) {
			const normalized = assertFilePath(path);
			const file = vault.getFileByPath(normalized);
			if (!file) throw new Error(`ENOENT: ${path}`);
			return new Uint8Array(await vault.readBinary(file));
		},

		async writeFile(path, content) {
			const normalized = assertFilePath(path);
			const existing = vault.getAbstractFileByPath(normalized);
			const data = toArrayBuffer(content);

			if (!existing) {
				await vault.createBinary(normalized, data);
				return;
			}

			if (!isFile(existing)) throw new Error(`EISDIR: ${path}`);
			await vault.modifyBinary(existing, data);
		},

		async mkdir(path, options) {
			const normalized = normalizePath(path);
			if (normalized === '') return;

			if (!options?.recursive) {
				await vault.createFolder(normalized);
				return;
			}

			const parts = normalized.split('/');
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

		async access(path) {
			if (!(await this.exists(path))) throw new Error(`ENOENT: ${path}`);
		},

		async stat(path): Promise<FileStat> {
			const normalized = normalizePath(path);
			if (normalized === '') {
				return { isFile: false, isDirectory: true };
			}

			const file = vault.getAbstractFileByPath(normalized);
			if (!file) throw new Error(`ENOENT: ${path}`);
			return {
				isFile: isFile(file),
				isDirectory: isFolder(file),
			};
		},

		async readdir(path) {
			const normalized = normalizePath(path);
			const folder =
				normalized === '' ? vault.getRoot() : vault.getFolderByPath(normalized);
			if (!folder) throw new Error(`ENOENT: ${path}`);
			return folder.children.map((child) => child.name);
		},

		async exists(path) {
			const normalized = normalizePath(path);
			if (normalized === '') return true;
			return vault.getAbstractFileByPath(normalized) !== null;
		},

		async glob() {
			throw new Error('Visible vault filesystem does not implement glob');
		},

		async deleteFile(path) {
			const normalized = assertFilePath(path);
			const file = vault.getAbstractFileByPath(normalized);
			if (!file) throw new Error(`ENOENT: ${path}`);
			if (!isFile(file)) throw new Error(`EISDIR: ${path}`);
			await vault.delete(file);
		},
	};
}
