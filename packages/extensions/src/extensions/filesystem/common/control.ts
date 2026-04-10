import type { Filesystem } from '@franklin/lib';
import type { Store } from '../../../api/store/types.js';
import { sha256Hex } from '../hash.js';
import type { FileRecord } from './key.js';

export function createFileControl(store: Store<FileRecord>) {
	return {
		/**
		 * Mark a file as "seen" by recording a hash of its content.
		 * If `content` is omitted, reads the file from disk.
		 */
		markFileRead: async (
			fs: Filesystem,
			path: string,
			content?: string | Uint8Array,
		): Promise<void> => {
			const absPath = await fs.resolve(path);
			const bytes =
				content !== undefined
					? typeof content === 'string'
						? new TextEncoder().encode(content)
						: content
					: await fs.readFile(path);
			const hash = sha256Hex(bytes);
			store.set((draft: FileRecord) => {
				draft[absPath] = hash;
			});
		},
	};
}
