import type { Filesystem } from '@franklin/lib';

import type { NoteLocatorResolver } from './note-locator/types.js';

export function createObsidianResolve(
	backupFs: Filesystem,
	noteLocatorResolver: NoteLocatorResolver,
): Filesystem['resolve'] {
	return async (...paths) => {
		const input = paths.at(-1);
		if (input !== undefined) {
			const resolved = noteLocatorResolver(input);
			if (resolved !== undefined) return resolved;
		}

		return backupFs.resolve(...paths);
	};
}
