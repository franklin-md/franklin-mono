import { FilePlus, FileText, FolderSearch, Pencil } from 'lucide-react';

import {
	editExtension,
	globExtension,
	readExtension,
	writeExtension,
} from '@franklin/extensions';
import type { ToolRendererRegistryEntries } from '@franklin/react';

import { FileBadge } from '../../../components/file-badge.js';
import { ToolSummaryDetail } from '../summary.js';
import { toolEntry } from '../entry.js';

export const fileToolRenderers = [
	toolEntry(readExtension.tools.readFile, FileText, 'Read', (args) => (
		<FileBadge path={args.path} />
	)),
	toolEntry(writeExtension.tools.writeFile, FilePlus, 'Write', (args) => (
		<FileBadge path={args.path} />
	)),
	toolEntry(editExtension.tools.editFile, Pencil, 'Edit', (args) => (
		<FileBadge path={args.path} />
	)),
	toolEntry(globExtension.tools.glob, FolderSearch, 'Search files', (args) => (
		<ToolSummaryDetail>
			{Array.isArray(args.pattern) ? args.pattern.join(', ') : args.pattern}
		</ToolSummaryDetail>
	)),
] satisfies ToolRendererRegistryEntries;
