import { DEFAULT_NETWORK_CONFIG } from '@franklin/agent';
import type { FranklinApp } from '@franklin/agent';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
import { joinAbsolute } from '@franklin/lib';
import type { Plugin } from 'obsidian';
import { createDefaultObsidianFilesystemPermissions } from '../../shared/obsidian/filesystem/permissions.js';
import { openInbox } from './lifetime.js';
import type { InboxLifetime } from './lifetime.js';
import { createInboxRunner } from './agent/run.js';
import { createInboxPersistence } from './storage/persistence.js';

type Options = {
	plugin: Plugin;
	app: FranklinApp;
	filesystem: Filesystem;
	appDir: AbsolutePath;
	vaultRoot: AbsolutePath;
};

// The plugin owns the queue; closing and reopening the view does not stop it.
export function startInbox({
	plugin,
	app,
	filesystem,
	appDir,
	vaultRoot,
}: Options): InboxLifetime {
	const path = joinAbsolute(appDir, 'inbox.json');
	return openInbox(plugin.app, path, {
		defaults: app.settings.get().defaultLLMConfig,
		persistence: createInboxPersistence({
			filesystem,
			path,
		}),
		run: createInboxRunner({
			createAgent: app.createAgent.bind(app),
			auth: app.auth,
			vaultName: plugin.app.vault.getName(),
			config: {
				fsConfig: {
					cwd: vaultRoot,
					permissions: createDefaultObsidianFilesystemPermissions(
						vaultRoot,
						plugin.app.vault.configDir,
					),
				},
				netConfig: structuredClone(DEFAULT_NETWORK_CONFIG),
			},
		}),
	});
}
