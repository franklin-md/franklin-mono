import type { FranklinApp } from '@franklin/agent';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
import { joinAbsolute } from '@franklin/lib';
import { Notice } from 'obsidian';
import type { Plugin } from 'obsidian';
import { createDefaultObsidianFilesystemPermissions } from '../../shared/obsidian/filesystem/permissions.js';
import { InboxController } from './controller/controller.js';
import { createInboxActionRunner } from './actions/run.js';
import { createSplitter } from './modes/run.js';
import { createInboxRunner } from './agent/run.js';
import { createInboxPersistence } from './storage/persistence.js';
import { CaptureController } from './capture/controller.js';
import { createCaptureOptions } from './capture/host.js';
import { createEvidenceRepository } from './evidence/repository.js';
import { openInbox } from './lifetime.js';

type Options = {
	plugin: Plugin;
	app: FranklinApp;
	filesystem: Filesystem;
	appDir: AbsolutePath;
	vaultRoot: AbsolutePath;
};

// This lifetime belongs to the plugin: closing the pane must not stop its queue.
export function startInbox(options: Options) {
	const path = joinAbsolute(options.appDir, 'inbox.json');
	return openInbox(options.plugin.app, path, (signal) =>
		createInbox(options, path, signal),
	);
}

async function createInbox(
	{ plugin, app, filesystem, appDir, vaultRoot }: Options,
	path: AbsolutePath,
	signal: AbortSignal,
): Promise<InboxController> {
	const evidence = createEvidenceRepository(
		joinAbsolute(appDir, 'inbox-research'),
	);
	const capture = await CaptureController.create(
		createCaptureOptions({
			appDir,
			vaultRoot,
			configDir: plugin.app.vault.configDir,
			evidence,
			notify: (message) => {
				new Notice(message);
			},
		}),
	);
	const runnerOptions = {
		evidence,
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
			netConfig: { allowedDomains: [], deniedDomains: [] },
		},
	};
	try {
		return await InboxController.create(
			{
				capture,
				evidence,
				defaults: app.settings.get().defaultLLMConfig,
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
			},
			signal,
		);
	} catch (error) {
		await capture.dispose();
		throw error;
	}
}
