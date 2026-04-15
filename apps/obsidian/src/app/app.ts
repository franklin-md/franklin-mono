import { FranklinApp } from '@franklin/agent/browser';
import type { Platform } from '@franklin/agent/browser';
import {
	conversationExtension,
	todoExtension,
	statusExtension,
	readExtension,
	writeExtension,
	editExtension,
	globExtension,
	bashExtension,
	createWebFetchExtension,
	createWebSearchExtension,
	spawnExtension,
} from '@franklin/extensions';
import type { AbsolutePath } from '@franklin/lib';
import { joinAbsolute, toAbsolutePath } from '@franklin/lib';
import type { Plugin } from 'obsidian';

import { createObsidianPlatform } from '../platform/index.js';
import {
	getPluginAbsolutePath,
	getVaultAbsolutePath,
} from '../utils/obsidian/path.js';

export interface ObsidianAppResult {
	app: FranklinApp;
	platform: Platform;
	vaultRoot: AbsolutePath;
}

const webFetchExtension = createWebFetchExtension({});
const webSearchExtension = createWebSearchExtension({});
const extensionBundles = [
	conversationExtension,
	todoExtension,
	statusExtension,
	readExtension,
	writeExtension,
	editExtension,
	globExtension,
	bashExtension,
	webFetchExtension,
	webSearchExtension,
	spawnExtension,
];
const extensions = extensionBundles.map((bundle) => bundle.extension);

export async function createFranklinApp(
	plugin: Plugin,
): Promise<ObsidianAppResult> {
	const platform = createObsidianPlatform(plugin.app);
	const vaultRoot = toAbsolutePath(getVaultAbsolutePath(plugin.app.vault));
	const appDir = joinAbsolute(
		toAbsolutePath(getPluginAbsolutePath(plugin.app.vault, plugin.manifest)),
		'.franklin',
	);

	await platform.filesystem.mkdir(appDir, { recursive: true });

	const app = new FranklinApp({
		extensions,
		platform,
		appDir,
	});
	await app.start();

	return { app, platform, vaultRoot };
}
