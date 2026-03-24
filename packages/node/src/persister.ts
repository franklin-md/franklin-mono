import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { createFilePersistence } from '@franklin/agent';
import type { FileSystemOps, Persister, SessionSnapshot } from '@franklin/agent';
import type { PoolStoreSnapshot } from '@franklin/extensions';

/**
 * Creates file-system-backed persistence for Node.js environments.
 *
 * Returns both a session persister and a pool-store
 * `Persister<PoolStoreSnapshot>` backed by the same directory.
 *
 * Layout:
 *   {dir}/sessions/{sessionId}.json
 *   {dir}/store/{poolId}.json
 */
export function createNodePersistence(dir: string): {
	session: Persister<SessionSnapshot>;
	pool: Persister<PoolStoreSnapshot>;
} {
	const fs: FileSystemOps = {
		readFile: (p) => readFile(p, 'utf-8'),
		writeFile: (p, d) => writeFile(p, d, 'utf-8'),
		readDir: (p) => readdir(p),
		deleteFile: (p) => unlink(p),
		mkdir: (p) => mkdir(p, { recursive: true }).then(() => {}),
	};

	return {
		session: createFilePersistence<SessionSnapshot>(`${dir}/sessions`, fs),
		pool: createFilePersistence<PoolStoreSnapshot>(`${dir}/store`, fs),
	};
}
