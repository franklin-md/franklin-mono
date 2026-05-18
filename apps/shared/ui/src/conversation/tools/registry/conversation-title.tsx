import { conversationTitleExtension } from '@franklin/extensions';
import {
	createToolRenderer,
	type ToolRendererRegistryEntries,
} from '@franklin/react';

export const conversationTitleToolRenderers = [
	createToolRenderer(conversationTitleExtension.tools.setChatTitle, {
		summary: () => null,
	}),
] satisfies ToolRendererRegistryEntries;
