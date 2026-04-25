import type { AgentCreateInput, FranklinApp } from '@franklin/agent/browser';
import type { AbsolutePath } from '@franklin/lib';

import { createDefaultObsidianFilesystemPermissions } from '../platform/filesystem/permissions.js';

export function createObsidianSessionInput(
	app: FranklinApp,
	vaultRoot: AbsolutePath,
	configDir: string,
): AgentCreateInput {
	return {
		overrides: {
			// New root sessions inherit the current app defaults plus the
			// Obsidian host environment constraints.
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
	};
}
