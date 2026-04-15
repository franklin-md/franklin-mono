import type { AbsolutePath } from '../paths/index.js';

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

export type { AbsolutePath };

export interface FileStat {
	isFile: boolean;
	isDirectory: boolean;
}

export interface Filesystem {
	resolve(...paths: string[]): Promise<AbsolutePath>;
	readFile(path: AbsolutePath): Promise<Uint8Array>;
	writeFile(path: AbsolutePath, content: string | Uint8Array): Promise<void>;
	mkdir(path: AbsolutePath, options?: { recursive?: boolean }): Promise<void>;
	access(path: AbsolutePath): Promise<void>;
	stat(path: AbsolutePath): Promise<FileStat>;
	readdir(path: AbsolutePath): Promise<string[]>;
	exists(path: AbsolutePath): Promise<boolean>;
	glob(
		pattern: string | string[],
		options: { root_dir?: AbsolutePath; ignore?: string[]; limit?: number },
	): Promise<string[]>;
	deleteFile(path: AbsolutePath): Promise<void>;
}
