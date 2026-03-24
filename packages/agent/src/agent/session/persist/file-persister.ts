import type { Persister, SessionSnapshot, FileSystemOps } from './types.js';

/**
 * Creates a Persister that stores each session as a JSON file.
 *
 * Parameterized by `FileSystemOps` so the same logic works in Node
 * (fs/promises) and Electron (IPC bridge to main process).
 *
 * Layout: `{dir}/{sessionId}.json`
 */
export function createFilePersister(dir: string, fs: FileSystemOps): Persister {
	let dirCreated = false;

	async function ensureDir(): Promise<void> {
		if (dirCreated) return;
		await fs.mkdir(dir);
		dirCreated = true;
	}

	function filePath(id: string): string {
		return `${dir}/${id}.json`;
	}

	return {
		async save(id, snapshot) {
			await ensureDir();
			await fs.writeFile(filePath(id), JSON.stringify(snapshot));
		},

		async load() {
			let entries: string[];
			try {
				entries = await fs.readDir(dir);
			} catch {
				// Directory doesn't exist yet — nothing to load
				return [];
			}

			const snapshots: SessionSnapshot[] = [];
			for (const entry of entries) {
				if (!entry.endsWith('.json')) continue;
				const raw = await fs.readFile(`${dir}/${entry}`);
				snapshots.push(JSON.parse(raw) as SessionSnapshot);
			}
			return snapshots;
		},

		async delete(id) {
			try {
				await fs.deleteFile(filePath(id));
			} catch {
				// Already gone — not an error
			}
		},
	};
}
