export interface FileStat {
	isFile(): boolean;
	isDirectory(): boolean;
}

export interface Filesystem {
	readFile(path: string): Promise<Uint8Array>;
	writeFile(path: string, content: string | Uint8Array): Promise<void>;
	mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
	access(path: string): Promise<void>;
	stat(path: string): Promise<FileStat>;
	readdir(path: string): Promise<string[]>;
	exists(path: string): Promise<boolean>;
	glob(
		pattern: string,
		options: { cwd?: string; ignore?: string[]; limit?: number },
	): Promise<string[]>;
	deleteFile(path: string): Promise<void>;
}
