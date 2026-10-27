import type {
	AbsolutePath,
	Filesystem,
	SingleFilePersister,
} from '@franklin/lib';
import { createSingleFilePersister } from '@franklin/lib';
import { inboxCodec } from '../controller/schema.js';
import type { InboxDocument } from '../controller/types.js';
import { writeAtomic } from '../storage/write.js';

type Options = { filesystem: Filesystem; path: AbsolutePath };

export function createInboxPersistence({
	filesystem,
	path,
}: Options): SingleFilePersister<InboxDocument> {
	const persister = createSingleFilePersister(filesystem, path, inboxCodec);
	return {
		...persister,
		async save(document) {
			// The controller serializes writes. A same-directory rename keeps the last
			// complete inbox intact if Obsidian exits during a write. Transcripts and
			// credential values never enter this versioned document.
			await writeAtomic(path, JSON.stringify(inboxCodec.encode(document)));
		},
	};
}
