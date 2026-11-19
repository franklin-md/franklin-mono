import type { Filesystem, SingleFilePersister } from '@franklin/lib';
import {
	createSingleFilePersister,
	MemoryFilesystem,
	toAbsolutePath,
} from '@franklin/lib';
import { inboxCodec } from '../controller/schema.js';
import type {
	InboxDocument,
	InboxPersistence,
	InboxSettings,
} from '../controller/types.js';
import { inboxSettingsCodec } from '../settings/codec.js';

// Holds inbox.json and inbox-settings.json in memory.
export function createInboxTestPersistence(
	initial?: InboxDocument,
	settings?: InboxSettings,
) {
	const inbox = memoryFile(initial);
	const saved = memoryFile(settings);
	const disk: InboxPersistence = { inbox: inbox.disk, settings: saved.disk };
	return { disk, read: inbox.read, readSettings: saved.read };
}

// Encodes and decodes both files with their codecs, as on disk.
export function createInboxCodecPersistence(
	filesystem: Filesystem = new MemoryFilesystem(),
): InboxPersistence {
	return {
		inbox: createSingleFilePersister(
			filesystem,
			toAbsolutePath('/inbox.json'),
			inboxCodec,
		),
		settings: createSingleFilePersister(
			filesystem,
			toAbsolutePath('/inbox-settings.json'),
			inboxSettingsCodec,
		),
	};
}

function memoryFile<T>(initial?: T) {
	let value = initial;
	const disk: SingleFilePersister<T> = {
		save: async (next) => {
			value = structuredClone(next);
		},
		load: async () => ({
			value: value ? structuredClone(value) : undefined,
			issues: [],
		}),
		delete: async () => {
			value = undefined;
		},
	};
	return { disk, read: () => value };
}
