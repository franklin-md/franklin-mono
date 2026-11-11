import { MCPConnections } from '@franklin/extension-mcp';
import { createMCPFetch } from '@franklin/node';
import { AuthManager, createAuthStore, FranklinApp } from '@franklin/agent';
import type { OrchestratorCreateInput, FranklinState } from '@franklin/agent';
import {
	bindHostAction,
	openExternalAction,
	type HostActionBinding,
} from '@franklin/react';
import { toAbsolutePath } from '@franklin/lib';
import { Notice } from 'obsidian';
import type { Plugin } from 'obsidian';
import type { InboxController } from '../apps/inbox/controller/controller.js';
import { errorMessage } from '../apps/inbox/controller/error.js';
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
	connections: MCPConnections;
	inbox: InboxController;
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

	const connections: MCPConnections = new MCPConnections({
		getServers: () => app.settings.get().mcpServers,
		getCredential: (id) => auth.getApiKey(id),
		subscribeConfiguration: (listener) => app.settings.subscribe(listener),
		subscribeCredentials: (listener) => auth.onAuthChange((id) => listener(id)),
		createFetch: createMCPFetch,
	});
	const app: FranklinApp = new FranklinApp({
		extensions: createChatExtensions(connections),
		platform,
		appDir,
		auth,
	});

	await app.start();
	const inbox = await startInbox({
		plugin,
		app,
		connections,
		filesystem: platform.os.filesystem,
		appDir,
		vaultRoot,
	});
	const getCreateInput = () =>
		createObsidianSessionInput(app, vaultRoot, plugin.app.vault.configDir);
	if (app.agents.list().length === 0) await app.agents.create(getCreateInput());

	return {
		app,
		connections,
		inbox,
		hostActionBindings: [
			bindHostAction(openExternalAction, (url) =>
				platform.os.openExternal(url),
			),
		],
		getCreateInput,
		dispose: () => {
			void connections.dispose();
			void inbox.dispose().catch((error: unknown) => {
				new Notice(`Inbox shutdown: ${errorMessage(error)}`);
			});
		},
	};
}
