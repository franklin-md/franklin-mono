import { AuthManager, createAuthStore, FranklinApp } from '@franklin/agent';
import type { OrchestratorCreateInput, FranklinState } from '@franklin/agent';
import {
	bindHostAction,
	openExternalAction,
	type HostActionBinding,
} from '@franklin/react';
import { toAbsolutePath } from '@franklin/lib';
import type { Plugin } from 'obsidian';
import type { InboxLifetime } from '../apps/inbox/lifetime.js';
import { startInbox } from '../apps/inbox/start.js';
import { createChatExtensions } from '../apps/chat/agent/extensions.js';
import { createObsidianSessionInput } from '../apps/chat/agent/session.js';
import { createObsidianPlatform } from '../shared/agent/platform.js';
import {
	getPluginAbsolutePath,
	getVaultAbsolutePath,
} from '../shared/obsidian/path.js';
import type { ObsidianDiffClient } from '../shared/diff/client.js';
import { resolveAuthStore } from '../shared/obsidian/auth/resolve.js';

interface PluginRuntime {
	app: FranklinApp;
	startInbox: () => InboxLifetime;
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

	const app: FranklinApp = new FranklinApp({
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
		startInbox: () =>
			startInbox({
				plugin,
				app,
				filesystem: platform.os.filesystem,
				appDir,
				vaultRoot,
			}),
		hostActionBindings: [
			bindHostAction(openExternalAction, (url) =>
				platform.os.openExternal(url),
			),
		],
		getCreateInput,
		// Removing app agents here would also remove their saved Chat sessions.
		dispose: () => undefined,
	};
}
