export type FileSystemOps = {
	readFile: (path: string) => Promise<string>;
	writeFile: (path: string, data: string) => Promise<void>;
	readDir: (path: string) => Promise<string[]>;
	deleteFile: (path: string) => Promise<void>;
	mkdir: (path: string) => Promise<void>;
};
