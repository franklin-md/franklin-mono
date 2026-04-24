import { FranklinApp } from '@franklin/agent/browser';
import type { FranklinExtension, Platform } from '@franklin/agent/browser';
import {
	conversationExtension,
	createWebExtension,
	environmentInfoExtension,
	filesystemExtension,
	instructionsExtension,
	spawnExtension,
	statusExtension,
	todoExtension,
} from '@franklin/extensions';
import type { AbsolutePath } from '@franklin/lib';
import { toAbsolutePath } from '@franklin/lib';
import type { Plugin } from 'obsidian';

import { createObsidianPlatform } from '../platform/index.js';
import {
	getPluginAbsolutePath,
	getVaultAbsolutePath,
} from '../utils/obsidian/path.js';
import type { ObsidianDiffClient } from '../diff/diff-client.js';
import { obsidianSystemPromptExtension } from './extensions/system-prompt.js';

interface ObsidianAppResult {
	app: FranklinApp;
	platform: Platform;
	vaultRoot: AbsolutePath;
}

const webExtension = createWebExtension({});
const extensionBundles = [
	conversationExtension,
	todoExtension,
	statusExtension,
	{ extension: obsidianSystemPromptExtension },
	instructionsExtension,
	filesystemExtension,
	webExtension,
	spawnExtension,
	environmentInfoExtension,
];
const extensions = extensionBundles.map(
	(bundle: { extension: FranklinExtension }) => bundle.extension,
);

export async function createFranklinApp(
	plugin: Plugin,
	diffClient: ObsidianDiffClient,
): Promise<ObsidianAppResult> {
	const platform = createObsidianPlatform(plugin.app, diffClient.onWrite);
	const vaultRoot = toAbsolutePath(getVaultAbsolutePath(plugin.app.vault));
	const appDir = toAbsolutePath(
		getPluginAbsolutePath(plugin.app.vault, plugin.manifest),
	);

	const app = new FranklinApp({
		extensions,
		platform,
		appDir,
	});

	await app.start();

	return { app, platform, vaultRoot };
}
