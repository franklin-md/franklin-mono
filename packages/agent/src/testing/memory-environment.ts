import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	toAbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import { configureFilesystem } from '../modules/environment/api/filesystem.js';
import { createReconfigurableEnvironment } from '../modules/environment/api/create.js';
import type { EnvironmentConfig } from '../modules/environment/api/types.js';

/** Real permission/scoping behavior over in-memory files, with no network or process effects. */
export function createMemoryEnvironment(
	filesystem: Filesystem = new MemoryFilesystem(),
	config: EnvironmentConfig = {
		fsConfig: {
			cwd: toAbsolutePath('/vault'),
			permissions: FILESYSTEM_ALLOW_ALL,
		},
		netConfig: { allowedDomains: [], deniedDomains: [] },
	},
) {
	return createReconfigurableEnvironment({
		config,
		osInfo: new MemoryOsInfo(),
		configureFilesystem: async (options) =>
			configureFilesystem(filesystem, options),
		configureProcess: async () => ({
			exec: async () => {
				throw new Error('Processes are unavailable in this test environment');
			},
		}),
		configureWeb: async () => ({
			fetch: async () => {
				throw new Error('Network is unavailable in this test environment');
			},
		}),
	});
}
