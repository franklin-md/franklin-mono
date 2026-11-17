import { AuthManager, createAuthStore, FranklinApp } from '@franklin/agent';
import type { FranklinState, OrchestratorCreateInput } from '@franklin/agent';
import {
	bindHostAction,
	openExternalAction,
	type HostActionBinding,
} from '@franklin/react';
import { toAbsolutePath } from '@franklin/lib';
import type { Plugin } from 'obsidian';

import { createObsidianPlatform } from '../shared/agent/platform.js';
import {
	getPluginAbsolutePath,
	getVaultAbsolutePath,
} from '../shared/obsidian/path.js';
import type { ObsidianDiffClient } from '../shared/diff/client.js';
import { resolveAuthStore } from '../shared/obsidian/auth/resolve.js';
import { createChatExtensions } from '../apps/chat/agent/extensions.js';
import { createObsidianSessionInput } from '../apps/chat/agent/session.js';

interface PluginRuntime {
	app: FranklinApp;
	hostActionBindings: readonly HostActionBinding[];
	getCreateInput: () => OrchestratorCreateInput<FranklinState>;
	dispose: () => void;
}

export async function bootstrapPlugin(
	plugin: Plugin,
	diffClient: ObsidianDiffClient,
): Promise<PluginRuntime> {
	const vaultRoot = toAbsolutePath(getVaultAbsolutePath(plugin.app.vault));
	const appDir = toAbsolutePath(
		getPluginAbsolutePath(plugin.app.vault, plugin.manifest),
	);
	const platform = createObsidianPlatform(
		plugin.app,
		appDir,
		diffClient.onWrite,
	);
	const authStore = await resolveAuthStore(plugin);
	const auth = new AuthManager(
		platform,
		authStore ?? createAuthStore(platform.os.filesystem, appDir),
	);

	const app = new FranklinApp({
		extensions: createChatExtensions(),
		platform,
		appDir,
		auth,
	});

	await app.start();
	const getCreateInput = () =>
		createObsidianSessionInput(app, vaultRoot, plugin.app.vault.configDir);
	if (app.agents.list().length === 0) await app.agents.create(getCreateInput());

	return {
		app,
		hostActionBindings: [
			bindHostAction(openExternalAction, (url) =>
				platform.os.openExternal(url),
			),
		],
		getCreateInput,
		// FranklinApp has no app-wide shutdown API. Keep the existing host hook;
		// removing agents would also delete their persisted sessions.
		dispose: () => undefined,
	};
}
