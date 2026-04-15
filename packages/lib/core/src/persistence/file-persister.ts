import type { AbsolutePath } from '../paths/index.js';
import { joinAbsolute } from '../paths/index.js';
import type { Filesystem } from '../filesystem/types.js';
import type { Persister } from './persister.js';

type PersistenceFilesystem = Pick<
	Filesystem,
	'readFile' | 'writeFile' | 'readdir' | 'deleteFile' | 'mkdir'
>;

/**
 * Creates a JSON-file-backed persister for a single snapshot directory.
 *
 * Layout: `{dir}/{id}.json`
 */
export function createFilePersistence<T>(
	dir: AbsolutePath,
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
			await fs.writeFile(
				joinAbsolute(dir, `${id}.json`),
				JSON.stringify(snapshot),
			);
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
				const raw = await fs.readFile(joinAbsolute(dir, entry));
				const text =
					typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
				snapshots.set(id, JSON.parse(text) as T);
			}
			return snapshots;
		},

		async delete(id) {
			try {
				await fs.deleteFile(joinAbsolute(dir, `${id}.json`));
			} catch {
				// Already gone — not an error
			}
		},
	};
}
