import { FranklinApp } from '@franklin/agent';
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
import type { PDFConverter } from '@franklin/agent';
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
import {
	createObsidianFreePDFConverter,
	createObsidianMistralPDFConverter,
	createObsidianPDFConverter,
} from './extensions/pdf/converters.js';
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
	const disposables: (() => void)[] = [];
	let obsidianPDFConverter:
		| ReturnType<typeof createObsidianPDFConverter>
		| undefined;

	const app = new FranklinApp({
		extensions: ({ auth }) => {
			const pdfConverter = createObsidianPDFConverter(auth, {
				renderScreenshots: renderObsidianPDFScreenshots,
				createFreeConverter: createObsidianFreePDFConverter,
				createMistralConverter: createObsidianMistralPDFConverter,
			});
			obsidianPDFConverter = pdfConverter;
			disposables.push(() => pdfConverter.dispose());
			return createExtensions(pdfConverter);
		},
		platform,
		appDir,
		authStore,
	});

	await app.start();
	obsidianPDFConverter?.refresh();

	return {
		app,
		platform,
		vaultRoot,
		dispose() {
			for (const dispose of disposables.splice(0)) {
				dispose();
			}
		},
	};
}

function createExtensions(pdfConverter: PDFConverter): FranklinExtension[] {
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
		createReadPDFExtension(pdfConverter),
		webExtension,
		// spawnExtension,
		environmentInfoExtension,
	];
	return extensionBundles.map(
		(bundle: { extension: FranklinExtension }) => bundle.extension,
	);
}
