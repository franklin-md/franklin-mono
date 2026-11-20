import { dirname } from 'node:path';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
import {
	createSingleFilePersister,
	joinAbsolute,
	toAbsolutePath,
} from '@franklin/lib';
import { inboxCodec } from '../controller/schema.js';
import type { InboxPersistence } from '../controller/types.js';
import { createInboxSettingsPersistence } from '../settings/persistence.js';
import { writeAtomic } from './write.js';

// path is inbox.json; its settings are saved beside it in inbox-settings.json.
type Options = { filesystem: Filesystem; path: AbsolutePath };

export function createInboxPersistence({
	filesystem,
	path,
}: Options): InboxPersistence {
	const persister = createSingleFilePersister(filesystem, path, inboxCodec);
	return {
		inbox: {
			...persister,
			async save(document) {
				// The controller serializes writes. A same-directory rename keeps the
				// last complete inbox intact if Obsidian exits during a write.
				// Transcripts and credential values never enter this versioned
				// document.
				await writeAtomic(path, JSON.stringify(inboxCodec.encode(document)));
			},
		},
		settings: createInboxSettingsPersistence({
			filesystem,
			path: joinAbsolute(toAbsolutePath(dirname(path)), 'inbox-settings.json'),
			legacyPath: path,
		}),
	};
}
