import type { AbsolutePath } from '../../paths/index.js';
import { joinAbsolute } from '../../paths/index.js';
import type { Filesystem } from '../../filesystem/types.js';
import type { Codec } from '../codec/types.js';
import type { Issue } from '../issue/types.js';
import { decodeMapEntry } from './decode.js';
import type { MapFilePersister, MapLoadResult } from './types.js';

type PersistenceFilesystem = Pick<
	Filesystem,
	'readFile' | 'writeFile' | 'readdir' | 'deleteFile' | 'mkdir' | 'exists'
>;

export function createMapFilePersister<T>(
	fs: PersistenceFilesystem,
	dir: AbsolutePath,
	codec: Codec<T>,
): MapFilePersister<T> {
	let dirCreated = false;

	async function ensureDir(): Promise<void> {
		if (dirCreated) return;
		await fs.mkdir(dir, { recursive: true });
		dirCreated = true;
	}

	return {
		async save(id, value) {
			await ensureDir();
			await fs.writeFile(
				joinAbsolute(dir, `${id}.json`),
				JSON.stringify(codec.encode(value)),
			);
		},

		async load(): Promise<MapLoadResult<T>> {
			if (!(await fs.exists(dir))) {
				return { values: new Map(), issues: [] };
			}

			let entries: string[];
			try {
				entries = await fs.readdir(dir);
			} catch {
				return { values: new Map(), issues: [] };
			}

			const values = new Map<string, T>();
			const issues: Issue[] = [];

			for (const entry of entries) {
				if (!entry.endsWith('.json')) continue;
				const id = entry.slice(0, -'.json'.length);
				const path = joinAbsolute(dir, entry);
				const result = await decodeMapEntry(fs, path, id, codec);
				if (result.issue) issues.push(result.issue);
				else values.set(id, result.value);
			}

			return { values, issues };
		},

		async delete(id) {
			try {
				await fs.deleteFile(joinAbsolute(dir, `${id}.json`));
			} catch {
				// Already gone
			}
		},
	};
}
