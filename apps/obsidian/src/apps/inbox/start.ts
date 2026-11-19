import { DEFAULT_NETWORK_CONFIG } from '@franklin/agent';
import type { FranklinApp } from '@franklin/agent';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
import { joinAbsolute } from '@franklin/lib';
import type { Plugin } from 'obsidian';
import { Notice } from 'obsidian';
import { createDefaultObsidianFilesystemPermissions } from '../../shared/obsidian/filesystem/permissions.js';
import { isDevBuild } from '../../dev/build.js';
import { openInbox } from './lifetime.js';
import type { InboxLifetime } from './lifetime.js';
import { createInboxRunner } from './agent/run.js';
import { createInboxActionRunner } from './actions/run.js';
import { createSplitter } from './modes/run.js';
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
	const runnerOptions = {
		createAgent: app.createAgent.bind(app),
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
	};
	return openInbox(plugin.app, path, {
		defaults: app.settings.get().defaultLLMConfig,
		traces: isDevBuild ? new Map<string, unknown>() : undefined,
		persistence: createInboxPersistence({
			filesystem,
			path,
		}),
		run: createInboxRunner(runnerOptions),
		split: createSplitter(runnerOptions),
		runAction: createInboxActionRunner(runnerOptions),
		onActionComplete: (name, summary) => {
			new Notice(`${name} ${summary}`);
		},
	});
}
