import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	toAbsolutePath,
} from '@franklin/lib';
import type { Fetch } from '@franklin/lib';
import {
	configureFilesystem,
	createReconfigurableEnvironment,
} from '@franklin/agent';
import type { EnvironmentConfig, EnvironmentFactory } from '@franklin/agent';

type Options = { fetch?: Fetch };

export function createInboxTestEnvironment({ fetch }: Options = {}) {
	const filesystem = new MemoryFilesystem();
	const config: EnvironmentConfig = {
		fsConfig: {
			cwd: toAbsolutePath('/vault'),
			permissions: FILESYSTEM_ALLOW_ALL,
		},
		netConfig: { allowedDomains: [], deniedDomains: [] },
	};
	const environment: EnvironmentFactory = (config) =>
		createReconfigurableEnvironment({
			config,
			osInfo: new MemoryOsInfo(),
			configureFilesystem: async (config) =>
				configureFilesystem(filesystem, config),
			configureProcess: async () => ({
				exec: async () => ({ exit_code: 0, stdout: '', stderr: '' }),
			}),
			configureWeb: async () => ({
				fetch:
					fetch ??
					(async () => {
						throw new Error('Unexpected network request');
					}),
			}),
		});
	return { filesystem, config, environment, vaultName: 'Study' };
}
