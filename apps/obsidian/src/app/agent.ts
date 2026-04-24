import type { FranklinApp, FranklinSystem } from '@franklin/agent/browser';
import type { SessionCreateInput } from '@franklin/extensions';
import type { AbsolutePath } from '@franklin/lib';

import { createDefaultObsidianFilesystemPermissions } from '../platform/filesystem/permissions.js';

type ObsidianAgentCreateOverrides = NonNullable<
	SessionCreateInput<FranklinSystem>['overrides']
>;

export function createObsidianAgentOverrides(
	app: FranklinApp,
	vaultRoot: AbsolutePath,
	configDir: string,
): ObsidianAgentCreateOverrides {
	return {
		core: { llmConfig: app.settings.get().defaultLLMConfig },
		env: {
			fsConfig: {
				cwd: vaultRoot,
				permissions: createDefaultObsidianFilesystemPermissions(
					vaultRoot,
					configDir,
				),
			},
			netConfig: {
				allowedDomains: [],
				deniedDomains: [],
			},
		},
	};
}

export function createObsidianAgentInput(
	app: FranklinApp,
	vaultRoot: AbsolutePath,
	configDir: string,
): SessionCreateInput<FranklinSystem> {
	return {
		overrides: createObsidianAgentOverrides(app, vaultRoot, configDir),
	};
}
