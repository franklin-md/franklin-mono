import { AuthManager, createAuthStore, FranklinApp } from '@franklin/agent';
import type { FranklinExtension, Platform } from '@franklin/agent';
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
	platform: Platform;
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
		extensions: () => createExtensions(),
		platform,
		appDir,
		auth,
	});

	await app.start();

	return {
		app,
		platform,
		vaultRoot,
		dispose: () => undefined,
	};
}

function createExtensions(): FranklinExtension[] {
	const filesystemExtension = createFilesystemExtension();
	const webExtension = createWebExtension({});
	const extensionBundles = [
		conversationExtension,
		conversationTitleExtension,
		todoExtension,
		statusExtension,
		{ extension: obsidianSystemPromptExtension },
		instructionsExtension,
		filesystemExtension,
		createReadPDFExtension({
			renderScreenshots: renderObsidianPDFScreenshots,
		}),
		webExtension,
		// spawnExtension,
		environmentInfoExtension,
	];
	return extensionBundles.map(
		(bundle: { extension: FranklinExtension }) => bundle.extension,
	);
}
