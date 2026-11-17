import type { FranklinExtension } from '@franklin/agent';
import { priority } from '@franklin/extensibility';
import {
	conversationExtension,
	conversationTitleExtension,
	createDuckDuckGoWebSearchProvider,
	createExaWebSearchProvider,
	createWebExtension,
	environmentInfoExtension,
	filesystemBundle,
	filesystemFileReferenceExtension,
	imageDocumentReferenceExtension,
	instructionsExtension,
	mentionExtension,
	referenceReadExtension,
	spawnExtension,
	statusExtension,
	textDocumentReferenceExtension,
	todoExtension,
	viewingContextExtension,
	webSearchProviders,
} from '@franklin/agent';
import { createPDFDocumentReferenceExtension } from '@franklin/extension-pdf';

import { renderObsidianPDFScreenshots } from '../../../shared/agent/pdf/screenshots.js';
import { obsidianSystemPromptExtension } from './system-prompt.js';

export function createChatExtensions(): FranklinExtension[] {
	const filesystemTools = [
		filesystemBundle.extensions.editFile,
		referenceReadExtension,
		filesystemBundle.extensions.writeFile,
		filesystemBundle.extensions.glob,
		filesystemBundle.extensions.grep,
	];
	const referenceProviders = [
		filesystemFileReferenceExtension,
		createPDFDocumentReferenceExtension({
			renderScreenshots: renderObsidianPDFScreenshots,
		}),
		imageDocumentReferenceExtension,
		textDocumentReferenceExtension,
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
		...referenceProviders,
		mentionExtension,
		webSearchProviders.of(createExaWebSearchProvider()),
		webSearchProviders.of(createDuckDuckGoWebSearchProvider()),
		createWebExtension({}).extension,
		spawnExtension.extension,
		environmentInfoExtension.extension,
	];
}
