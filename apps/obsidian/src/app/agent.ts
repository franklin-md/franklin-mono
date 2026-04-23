import type { FranklinApp, FranklinRuntime } from '@franklin/agent/browser';
import type { AbsolutePath } from '@franklin/lib';
import { createDefaultObsidianFilesystemPermissions } from '../platform/filesystem/permissions.js';

export async function getDefaultAgent(
	app: FranklinApp,
	vaultRoot: AbsolutePath,
	configDir: string,
): Promise<FranklinRuntime> {
	// TODO(FRA-191): Recycle persisted session instead of always creating fresh
	const session = await app.agents.create({
		overrides: {
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
		},
	});

	return session.runtime;
}
