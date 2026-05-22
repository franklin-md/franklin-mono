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
	createFilesystemExtension,
	createReadPDFExtension,
	createWebExtension,
	environmentInfoExtension,
	instructionsExtension,
	statusExtension,
	todoExtension,
} from '@franklin/agent';
import type { AbsolutePath } from '@franklin/lib';
import { toAbsolutePath } from '@franklin/lib';
import type { Plugin } from 'obsidian';

import { createObsidianPlatform } from '../platform/index.js';
import {
	getPluginAbsolutePath,
	getVaultAbsolutePath,
} from '../utils/obsidian/path.js';
import type { ObsidianDiffClient } from '../diff/client.js';
import { resolveAuthStore } from './auth/resolve.js';
import { renderObsidianPDFScreenshots } from './extensions/pdf/screenshots.js';
import { obsidianSystemPromptExtension } from './extensions/system-prompt.js';

interface ObsidianAppResult {
	app: FranklinApp;
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
		extensions: createExtensions(),
		platform,
		appDir,
		auth,
	});

	await app.start();

	return {
		app,
		hostActionBindings: [
			bindHostAction(openExternalAction, (url) =>
				platform.os.openExternal(url),
			),
		],
		vaultRoot,
		dispose: () => undefined,
	};
}

function createExtensions(): FranklinExtension[] {
	return [
		conversationExtension.extension,
		conversationTitleExtension.extension,
		todoExtension.extension,
		statusExtension.extension,
		priority.highest(obsidianSystemPromptExtension),
		instructionsExtension.extension,
		createFilesystemExtension().extension,
		createReadPDFExtension({
			renderScreenshots: renderObsidianPDFScreenshots,
		}).extension,
		createWebExtension({}).extension,
		// spawnExtension.extension,
		environmentInfoExtension.extension,
	];
}
