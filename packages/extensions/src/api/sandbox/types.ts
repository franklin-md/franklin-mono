export interface Filesystem {
	readFile(path: string): Promise<Buffer>;
	writeFile(path: string, content: string | Buffer): Promise<void>;
	mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
	access(path: string): Promise<void>;
	stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean }>;
	readdir(path: string): Promise<string[]>;
	exists(path: string): Promise<boolean>;
	glob(
		pattern: string,
		options: { cwd: string; ignore?: string[]; limit?: number },
	): Promise<string[]>;
}

export interface Terminal {
	exec(
		command: string,
		cwd: string,
		options: {
			onData: (data: Buffer) => void;
			signal?: AbortSignal;
			timeout?: number;
			env?: NodeJS.ProcessEnv;
		},
	): Promise<{ exitCode: number | null }>;
}

export interface Sandbox {
	readonly cwd: string;
	readonly fs: Filesystem;
	readonly terminal: Terminal;
}
