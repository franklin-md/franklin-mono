import type { PersistenceFilesystem } from './file-system.js';
import type { Persister } from './persister.js';

/**
 * Creates a JSON-file-backed persister for a single snapshot directory.
 *
 * Layout: `{dir}/{id}.json`
 */
export function createFilePersistence<T>(
	dir: string,
	fs: PersistenceFilesystem,
): Persister<T> {
	let dirCreated = false;

	async function ensureDir(): Promise<void> {
		if (dirCreated) return;
		await fs.mkdir(dir, { recursive: true });
		dirCreated = true;
	}

	return {
		async save(id, snapshot) {
			await ensureDir();
			await fs.writeFile(`${dir}/${id}.json`, JSON.stringify(snapshot));
		},

		async load() {
			let entries: string[];
			try {
				entries = await fs.readdir(dir);
			} catch {
				// Directory doesn't exist yet — nothing to load
				return new Map<string, T>();
			}

			const snapshots = new Map<string, T>();
			for (const entry of entries) {
				if (!entry.endsWith('.json')) continue;
				const id = entry.slice(0, -'.json'.length);
				const raw = await fs.readFile(`${dir}/${entry}`);
				snapshots.set(id, JSON.parse(raw.toString('utf-8')) as T);
			}
			return snapshots;
		},

		async delete(id) {
			try {
				await fs.deleteFile(`${dir}/${id}.json`);
			} catch {
				// Already gone — not an error
			}
		},
	};
}
