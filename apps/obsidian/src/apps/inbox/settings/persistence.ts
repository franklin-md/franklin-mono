import { createSingleFilePersister } from '@franklin/lib';
import type {
	AbsolutePath,
	Filesystem,
	SingleFilePersister,
} from '@franklin/lib';
import { writeAtomic } from '../../../shared/persistence/write.js';
import { settingsDocumentCodec } from '../controller/schema.js';
import type { InboxSettings } from '../controller/types.js';
import { inboxSettingsCodec } from './codec.js';

type Options = {
	filesystem: Filesystem;
	path: AbsolutePath;
	// inbox.json, which held these settings up to version 11.
	legacyPath: AbsolutePath;
};

export function createInboxSettingsPersistence({
	filesystem,
	path,
	legacyPath,
}: Options): SingleFilePersister<InboxSettings> {
	const persister = createSingleFilePersister(
		filesystem,
		path,
		inboxSettingsCodec,
	);
	const legacy = createSingleFilePersister(
		filesystem,
		legacyPath,
		settingsDocumentCodec,
	);
	return {
		...persister,
		async load() {
			const restored = await persister.load();
			if (restored.value || restored.issues.length) return restored;
			// Until this file is first written, the settings are those inbox.json
			// held. A version 12 inbox.json no longer holds them and cannot be read
			// here, so a deleted settings file falls back to the defaults.
			const { value } = await legacy.load();
			return {
				value: value && { ...value.preferences, actions: value.actions },
				issues: [],
			};
		},
		save: (value) =>
			writeAtomic(path, JSON.stringify(inboxSettingsCodec.encode(value))),
	};
}
