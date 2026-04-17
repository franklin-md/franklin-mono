import type { AbsolutePath } from '../../paths/index.js';
import type { Filesystem } from '../../filesystem/types.js';
import type { Codec } from '../codec/types.js';
import { decodeSingleFile } from './decode.js';
import type { SingleFilePersister } from './types.js';

type PersistenceFilesystem = Pick<
	Filesystem,
	'readFile' | 'writeFile' | 'deleteFile' | 'exists'
>;

export function createSingleFilePersister<T>(
	fs: PersistenceFilesystem,
	path: AbsolutePath,
	codec: Codec<T>,
): SingleFilePersister<T> {
	return {
		async save(value) {
			await fs.writeFile(path, JSON.stringify(codec.encode(value), null, 2));
		},
		load() {
			return decodeSingleFile(fs, path, codec);
		},
		async delete() {
			try {
				await fs.deleteFile(path);
			} catch {
				// Already gone
			}
		},
	};
}
