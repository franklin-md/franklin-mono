import {
	access,
	glob,
	mkdir,
	readdir,
	readFile,
	stat,
	unlink,
	writeFile,
} from 'node:fs/promises';
import type { Filesystem } from '@franklin/lib';

/**
 * Creates a `Filesystem` implementation backed by Node.js `fs/promises`.
 */
export function createNodeFilesystem(): Filesystem {
	return {
		readFile: (path) => readFile(path),
		writeFile: (path, data) => writeFile(path, data),
		mkdir: (path, options) => mkdir(path, options).then(() => undefined),
		access: (path) => access(path),
		async stat(path) {
			const stats = await stat(path);
			return {
				isFile: stats.isFile(),
				isDirectory: stats.isDirectory(),
			};
		},
		readdir: (path) => readdir(path),
		async exists(path) {
			try {
				await access(path);
				return true;
			} catch {
				return false;
			}
		},
		async glob(pattern, options) {
			const results: string[] = [];
			for await (const entry of glob(pattern, {
				cwd: options.cwd,
				exclude: options.ignore,
			})) {
				results.push(entry);
				if (options.limit && results.length >= options.limit) break;
			}
			return results;
		},
		deleteFile: (path) => unlink(path),
	};
}
