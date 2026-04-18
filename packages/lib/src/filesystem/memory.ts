import type { AbsolutePath, FileStat, Filesystem } from './types.js';
import { toAbsolutePath } from '../paths/index.js';

/**
 * In-memory `Filesystem` implementation for tests.
 *
 * Supports the operations persisters and most call sites use: readFile,
 * writeFile, readdir, deleteFile, mkdir, exists, stat, access.
 * `glob` throws if called.
 */
export class MemoryFilesystem implements Filesystem {
	private files = new Map<string, Uint8Array>();
	private dirs = new Set<string>();

	resolve(...paths: string[]): Promise<AbsolutePath> {
		return Promise.resolve(toAbsolutePath(paths.join('/')));
	}

	async readFile(path: AbsolutePath): Promise<Uint8Array> {
		const data = this.files.get(path);
		if (!data) throw enoent(path);
		return data;
	}

	async writeFile(
		path: AbsolutePath,
		content: string | Uint8Array,
	): Promise<void> {
		const bytes =
			typeof content === 'string' ? new TextEncoder().encode(content) : content;
		this.files.set(path, bytes);
	}

	async mkdir(
		path: AbsolutePath,
		_options?: { recursive?: boolean },
	): Promise<void> {
		this.dirs.add(path);
	}

	async access(path: AbsolutePath): Promise<void> {
		if (!this.files.has(path) && !this.dirs.has(path)) throw enoent(path);
	}

	async stat(path: AbsolutePath): Promise<FileStat> {
		if (this.files.has(path)) return { isFile: true, isDirectory: false };
		if (this.dirs.has(path)) return { isFile: false, isDirectory: true };
		throw enoent(path);
	}

	async readdir(path: AbsolutePath): Promise<string[]> {
		if (!this.dirs.has(path)) throw enoent(path);
		const prefix = path.endsWith('/') ? path : `${path}/`;
		const entries: string[] = [];
		for (const file of this.files.keys()) {
			if (!file.startsWith(prefix)) continue;
			const rest = file.slice(prefix.length);
			if (!rest.includes('/')) entries.push(rest);
		}
		return entries;
	}

	async exists(path: AbsolutePath): Promise<boolean> {
		return this.files.has(path) || this.dirs.has(path);
	}

	async glob(): Promise<string[]> {
		throw new Error('glob not implemented in MemoryFilesystem');
	}

	async deleteFile(path: AbsolutePath): Promise<void> {
		if (!this.files.has(path)) throw enoent(path);
		this.files.delete(path);
	}

	/** Test helper: seed file content directly. */
	seed(path: AbsolutePath, content: string): void {
		this.files.set(path, new TextEncoder().encode(content));
	}

	/** Test helper: ensure a directory exists without touching files. */
	seedDir(path: AbsolutePath): void {
		this.dirs.add(path);
	}

	/** Test helper: check whether a file is present. */
	has(path: AbsolutePath): boolean {
		return this.files.has(path);
	}
}

function enoent(path: string): Error & { code: string } {
	const err = new Error(`ENOENT: ${path}`) as Error & { code: string };
	err.code = 'ENOENT';
	return err;
}
