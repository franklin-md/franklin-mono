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
import { createFilePersistence } from '@franklin/agent';
import type { Filesystem, Persister, SessionSnapshot } from '@franklin/agent';
import type { StoreSnapshot } from '@franklin/extensions';

/**
 * Creates file-system-backed persistence for Node.js environments.
 *
 * Returns both a session persister and a pool-store
 * `Persister<StoreSnapshot>` backed by the same directory.
 *
 * Layout:
 *   {dir}/sessions/{sessionId}.json
 *   {dir}/store/{ref}.json
 */
export function createNodePersistence(dir: string): {
	session: Persister<SessionSnapshot>;
	pool: Persister<StoreSnapshot>;
} {
	const fs: Filesystem = {
		readFile: (path) => readFile(path),
		writeFile: (path, data) => writeFile(path, data),
		mkdir: (path, options) => mkdir(path, options).then(() => undefined),
		access: (path) => access(path),
		async stat(path) {
			const stats = await stat(path);
			return {
				isFile: () => stats.isFile(),
				isDirectory: () => stats.isDirectory(),
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

	return {
		session: createFilePersistence<SessionSnapshot>(`${dir}/sessions`, fs),
		pool: createFilePersistence<StoreSnapshot>(`${dir}/store`, fs),
	};
}
