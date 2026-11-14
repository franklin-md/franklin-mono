import { encode } from '@franklin/lib';
import type { Filesystem } from '@franklin/lib';
import type { Store } from '../../../modules/store/api/types.js';
import { sha256Hex } from '../hash.js';
import type { FileRecord } from './key.js';
import { detectFileType } from './supported.js';

export function createFileControl(store: Store<FileRecord>) {
	return {
		/**
		 * Record the latest hash and, for UTF-8 text, one full snapshot per path.
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
						? encode(content)
						: content
					: await fs.readFile(absPath);
			const hash = sha256Hex(bytes);
			const mime = detectFileType(bytes)?.mime;
			let text: string | undefined;
			if (!mime || mime.startsWith('text/') || mime === 'image/svg+xml') {
				try {
					text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
					if (text.includes('\0')) text = undefined;
				} catch {
					// Binary/unsupported reads retain the conservative hash-only check.
				}
			}
			store.set((draft: FileRecord) => {
				draft[absPath] = text === undefined ? hash : { hash, text };
			});
		},
	};
}
