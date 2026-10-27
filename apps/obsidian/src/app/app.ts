import { AuthManager, createAuthStore, FranklinApp } from '@franklin/agent';
import type { FranklinExtension } from '@franklin/agent';
import {
	bindHostAction,
	openExternalAction,
	type HostActionBinding,
} from '@franklin/react';
import { priority } from '@franklin/extensibility';
import {
	conversationExtension,
	conversationTitleExtension,
	createDuckDuckGoWebSearchProvider,
	createExaWebSearchProvider,
	createWebExtension,
	environmentInfoExtension,
	filesystemBundle,
	instructionsExtension,
	mentionExtension,
	referenceReadExtension,
	spawnExtension,
	statusExtension,
	todoExtension,
	viewingContextExtension,
	webSearchProviders,
} from '@franklin/agent';
import type { AbsolutePath } from '@franklin/lib';
import { joinAbsolute, toAbsolutePath } from '@franklin/lib';
import { Notice } from 'obsidian';
import type { Plugin } from 'obsidian';
import { createMiniACPRpcConnector } from '@franklin/mini-acp/rpc';
import { InboxController } from '../inbox/controller/controller.js';
import { createInboxActionRunner } from '../inbox/actions/run.js';
import { createInboxRunner } from '../inbox/agent/run.js';
import { createInboxPersistence } from '../inbox/host/persistence.js';
import { errorMessage } from '../inbox/controller/error.js';
import { CaptureController } from '../inbox/capture/controller.js';
import { createCaptureOptions } from '../inbox/capture/host.js';
import { createEvidenceRepository } from '../inbox/capture/evidence/repository.js';

import { createObsidianPlatform } from '../platform/index.js';
import {
	getPluginAbsolutePath,
	getVaultAbsolutePath,
} from '../utils/obsidian/path.js';
import type { ObsidianDiffClient } from '../diff/client.js';
import { resolveAuthStore } from './auth/resolve.js';
import { createObsidianReferenceExtensions } from './extensions/references.js';
import { createDefaultObsidianFilesystemPermissions } from '../platform/filesystem/permissions.js';
import { obsidianSystemPromptExtension } from './extensions/system-prompt.js';

interface ObsidianAppResult {
	app: FranklinApp;
	inbox: InboxController;
	hostActionBindings: readonly HostActionBinding[];
	vaultRoot: AbsolutePath;
	dispose(): void;
}

export async function createFranklinApp(
	plugin: Plugin,
	diffClient: ObsidianDiffClient,
): Promise<ObsidianAppResult> {
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
		extensions: createObsidianExtensions(),
		platform,
		appDir,
		auth,
	});

	await app.start();
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
		connect: createMiniACPRpcConnector(platform.spawn),
		auth,
		environment: platform.environment,
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
	const inbox = await InboxController.create({
		capture,
		defaults: app.settings.get().defaultLLMConfig,
		persistence: createInboxPersistence({
			filesystem: platform.os.filesystem,
			path: joinAbsolute(appDir, 'inbox.json'),
		}),
		run: createInboxRunner(runnerOptions),
		runAction: createInboxActionRunner(runnerOptions),
		onActionComplete: (name, summary) => {
			new Notice(`${name} ${summary}`);
		},
	});

	return {
		app,
		inbox,
		hostActionBindings: [
			bindHostAction(openExternalAction, (url) =>
				platform.os.openExternal(url),
			),
		],
		vaultRoot,
		dispose: () => {
			void inbox.dispose().catch((error: unknown) => {
				new Notice(`Inbox shutdown: ${errorMessage(error)}`);
			});
		},
	};
}

export function createObsidianExtensions(): FranklinExtension[] {
	const filesystemTools = [
		filesystemBundle.extensions.editFile,
		referenceReadExtension,
		filesystemBundle.extensions.writeFile,
		filesystemBundle.extensions.glob,
		filesystemBundle.extensions.grep,
	];

	return [
		conversationExtension.extension,
		conversationTitleExtension.extension,
		todoExtension.extension,
		statusExtension.extension,
		viewingContextExtension.extension,
		priority.highest(obsidianSystemPromptExtension),
		instructionsExtension.extension,
		...filesystemTools,
		...createObsidianReferenceExtensions(),
		mentionExtension,
		webSearchProviders.of(createExaWebSearchProvider()),
		webSearchProviders.of(createDuckDuckGoWebSearchProvider()),
		createWebExtension({}).extension,
		spawnExtension.extension,
		environmentInfoExtension.extension,
	];
}
