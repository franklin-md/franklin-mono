import {
	FilePlus,
	FileText,
	FolderSearch,
	Pencil,
	TextSearch,
} from 'lucide-react';

import { filesystemExtension } from '@franklin/extensions';
import type { ToolRendererRegistryEntries } from '@franklin/react';

import { FileBadge } from '../../../components/file-badge.js';
import { ToolSummaryDetail } from '../summary.js';
import { toolEntry } from '../entry.js';

export const fileToolRenderers = [
	toolEntry(filesystemExtension.tools.readFile, FileText, 'Read', (args) => (
		<FileBadge path={args.path} />
	)),
	toolEntry(filesystemExtension.tools.writeFile, FilePlus, 'Write', (args) => (
		<FileBadge path={args.path} />
	)),
	toolEntry(filesystemExtension.tools.editFile, Pencil, 'Edit', (args) => (
		<FileBadge path={args.path} />
	)),
	toolEntry(
		filesystemExtension.tools.glob,
		FolderSearch,
		'Search files',
		(args) => (
			<ToolSummaryDetail>
				{Array.isArray(args.pattern) ? args.pattern.join(', ') : args.pattern}
			</ToolSummaryDetail>
		),
	),
	toolEntry(filesystemExtension.tools.grep, TextSearch, 'Grep', (args) => (
		<ToolSummaryDetail>{args.pattern}</ToolSummaryDetail>
	)),
] satisfies ToolRendererRegistryEntries;
