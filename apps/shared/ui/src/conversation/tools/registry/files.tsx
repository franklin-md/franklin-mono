import {
	FilePlus,
	FileText,
	FolderSearch,
	Pencil,
	TextSearch,
} from 'lucide-react';

import { filesystemBundle } from '@franklin/agent';
import type { ToolRendererRegistryEntries } from '@franklin/react';

import { FileBadge } from '../../../components/file-icon/badge.js';
import { ToolSummaryDetail } from '../summary.js';
import { toolEntry } from '../entry.js';

export const fileToolRenderers = [
	toolEntry(filesystemBundle.tools.readFile, FileText, 'Read', (args) => (
		<FileBadge path={args.path} className="shimmerable" />
	)),
	toolEntry(filesystemBundle.tools.writeFile, FilePlus, 'Write', (args) => (
		<FileBadge path={args.path} className="shimmerable" />
	)),
	toolEntry(filesystemBundle.tools.editFile, Pencil, 'Edit', (args) => (
		<FileBadge path={args.path} className="shimmerable" />
	)),
	toolEntry(
		filesystemBundle.tools.glob,
		FolderSearch,
		'Search files',
		(args) => (
			<ToolSummaryDetail>
				{Array.isArray(args.pattern) ? args.pattern.join(', ') : args.pattern}
			</ToolSummaryDetail>
		),
	),
	toolEntry(filesystemBundle.tools.grep, TextSearch, 'Grep', (args) => (
		<ToolSummaryDetail>{args.pattern}</ToolSummaryDetail>
	)),
] satisfies ToolRendererRegistryEntries;
