import type { MCPConnections } from '@franklin/extension-mcp';
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
	tableExtension,
	viewingContextExtension,
	webSearchProviders,
} from '@franklin/agent';
import { createObsidianReferenceExtensions } from '../../../shared/agent/references.js';
import { obsidianSystemPromptExtension } from './system-prompt.js';

export function createChatExtensions(
	connections?: MCPConnections,
): FranklinExtension[] {
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
		tableExtension(),
		...(connections ? [connections.extension()] : []),
		bashExtension.extension,
		...createObsidianReferenceExtensions(),
		mentionExtension,
		webSearchProviders.compute([], () =>
			connections?.hasExaPreset()
				? [createDuckDuckGoWebSearchProvider()]
				: [createExaWebSearchProvider(), createDuckDuckGoWebSearchProvider()],
		),
		createWebExtension({}).extension,
		spawnExtension.extension,
		environmentInfoExtension.extension,
	];
}
