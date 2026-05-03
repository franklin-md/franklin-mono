import type { Filesystem } from '@franklin/lib';
import {
	createFolderScopedFilesystem,
	createFilteredFilesystem,
} from '@franklin/lib';
import type { FilesystemConfig } from './types.js';

export function configureFilesystem(
	raw: Filesystem,
	config: FilesystemConfig,
): Filesystem {
	const filtered = createFilteredFilesystem(config.permissions, raw);
	return createFolderScopedFilesystem(config.cwd, filtered);
}
