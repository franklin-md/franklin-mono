import { filesystemExtension } from '@franklin/extensions';
import {
	createToolRendererRegistry,
	type ToolRendererEntry,
	type ToolRendererRegistryEntries,
} from '@franklin/react';
import { defaultToolRenderers, toolEntry } from '@franklin/ui';
import { FilePlus, FileText, Pencil } from 'lucide-react';

import { ObsidianFileBadge } from './obsidian-file-badge.js';

const obsidianFileToolRenderers = [
	toolEntry(filesystemExtension.tools.readFile, FileText, 'Read', (args) => (
		<ObsidianFileBadge path={args.path} />
	)),
	toolEntry(filesystemExtension.tools.writeFile, FilePlus, 'Write', (args) => (
		<ObsidianFileBadge path={args.path} />
	)),
	toolEntry(filesystemExtension.tools.editFile, Pencil, 'Edit', (args) => (
		<ObsidianFileBadge path={args.path} />
	)),
] satisfies ToolRendererRegistryEntries;

const hiddenFallbackEntry: ToolRendererEntry = {
	summary: () => null,
};

export const obsidianToolRegistry = createToolRendererRegistry([
	...defaultToolRenderers,
	...obsidianFileToolRenderers,
	['*', hiddenFallbackEntry],
] satisfies ToolRendererRegistryEntries);
