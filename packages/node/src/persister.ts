import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { createFilePersister } from '@franklin/agent';
import type { Persister } from '@franklin/agent';

/**
 * Creates a file-system-backed Persister for Node.js environments.
 *
 * Sessions are stored as `{dir}/{sessionId}.json`.
 */
export function createNodePersister(dir: string): Persister {
	return createFilePersister(dir, {
		readFile: (p) => readFile(p, 'utf-8'),
		writeFile: (p, d) => writeFile(p, d, 'utf-8'),
		readDir: (p) => readdir(p),
		deleteFile: (p) => unlink(p),
		mkdir: (p) => mkdir(p, { recursive: true }).then(() => {}),
	});
}
