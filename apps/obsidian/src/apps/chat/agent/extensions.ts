import type { FranklinExtension } from '@franklin/agent';
import { priority } from '@franklin/extensibility';
import {
	bashExtension,
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
import { createObsidianReferenceExtensions } from '../../../shared/agent/references.js';
import { obsidianSystemPromptExtension } from './system-prompt.js';

export function createChatExtensions(): FranklinExtension[] {
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
		bashExtension.extension,
		...createObsidianReferenceExtensions(),
		mentionExtension,
		webSearchProviders.of(createExaWebSearchProvider()),
		webSearchProviders.of(createDuckDuckGoWebSearchProvider()),
		createWebExtension({}).extension,
		spawnExtension.extension,
		environmentInfoExtension.extension,
	];
}
