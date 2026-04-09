import {
	FileText,
	FilePlus,
	Pencil,
	FolderSearch,
	GitBranch,
	Globe,
	ListPlus,
	ListChecks,
	List,
	Wrench,
} from 'lucide-react';

import {
	editExtension,
	globExtension,
	createWebFetchExtension,
	readExtension,
	todoExtension,
	writeExtension,
} from '@franklin/extensions';
import { createToolRendererRegistry } from '@franklin/react';

import { iconEntry, toolEntry } from './entry.js';

const webFetchExtension = createWebFetchExtension({});

export const toolRegistry = createToolRendererRegistry([
	toolEntry(readExtension.tools.readFile, FileText, 'Read file', (a) => a.path),
	toolEntry(
		writeExtension.tools.writeFile,
		FilePlus,
		'Write file',
		(a) => a.path,
	),
	toolEntry(editExtension.tools.editFile, Pencil, 'Edit file', (a) => a.path),
	toolEntry(globExtension.tools.glob, FolderSearch, 'Search files', (a) =>
		Array.isArray(a.pattern) ? a.pattern.join(', ') : a.pattern,
	),
	toolEntry(webFetchExtension.tools.fetchUrl, Globe, 'Fetch web page', (a) => {
		try {
			const url = new URL(a.url);
			return url.hostname;
		} catch {
			return a.url;
		}
	}),
	['spawn', iconEntry(GitBranch, 'Spawn agent')],
	toolEntry(todoExtension.tools.addTodo, ListPlus, 'Add todo', (a) => a.text),
	toolEntry(todoExtension.tools.completeTodo, ListChecks, 'Complete todo'),
	toolEntry(todoExtension.tools.listTodos, List, 'List todos'),
	[
		'*',
		{
			summary: ({ block }) => (
				<>
					<Wrench className="h-3 w-3 shrink-0" />
					<span>{block.call.name}</span>
				</>
			),
		},
	],
]);
