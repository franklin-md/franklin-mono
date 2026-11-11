import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	toAbsolutePath,
} from '@franklin/lib';
import type { Fetch } from '@franklin/lib';
import {
	configureFilesystem,
	createFranklinAgents,
	createReconfigurableEnvironment,
} from '@franklin/agent';
import type {
	AuthManager,
	EnvironmentConfig,
	EnvironmentFactory,
} from '@franklin/agent';
import type { MiniACPConnector } from '@franklin/mini-acp';
import type { InboxRunnerOptions } from './types.js';

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
	return {
		filesystem,
		runnerOptions(
			connect: MiniACPConnector,
			auth: AuthManager,
		): InboxRunnerOptions {
			return {
				auth,
				config,
				vaultName: 'Study',
				createAgent: async ({ extensions, state }) => {
					const { runtime } = await createFranklinAgents({
						connect,
						auth,
						environment,
						extensions,
					}).create({ state });
					return runtime;
				},
			};
		},
	};
}
