import { createSingleFilePersister } from '@franklin/lib';
import type { AbsolutePath, SingleFilePersister } from '@franklin/lib';
import { createNodeFilesystem } from '@franklin/node';
import { writeAtomic } from '../../../shared/persistence/write.js';
import type { QuickEditSettings } from '../types.js';
import { quickEditSettingsCodec } from './codec.js';

export function createQuickEditPersistence(
	path: AbsolutePath,
): SingleFilePersister<QuickEditSettings> {
	const persistence = createSingleFilePersister(
		createNodeFilesystem(),
		path,
		quickEditSettingsCodec,
	);
	return {
		...persistence,
		save: (value) =>
			writeAtomic(path, JSON.stringify(quickEditSettingsCodec.encode(value))),
	};
}
