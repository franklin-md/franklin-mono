import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
	FileText,
	FilePlus,
	Pencil,
	FolderSearch,
	GitBranch,
	ListPlus,
	ListChecks,
	List,
	Wrench,
} from 'lucide-react';

import {
	createToolRendererRegistry,
	type ToolRendererEntry,
} from '@franklin/react';

function toolEntry<T = Record<string, unknown>>(
	Icon: LucideIcon,
	label: string,
	detail?: (args: T) => ReactNode,
): ToolRendererEntry<T> {
	return {
		summary: ({ args }) => {
			const d = detail?.(args);
			return (
				<>
					<Icon className="h-3 w-3 shrink-0" />
					<span className="shrink-0">{label}</span>
					{d != null && (
						<span className="truncate text-muted-foreground/50">{d}</span>
					)}
				</>
			);
		},
	};
}

type FilePath = { path: string };
type GlobArgs = { pattern: string | string[] };
type TodoText = { text: string };

export const toolRegistry = createToolRendererRegistry({
	read_file: toolEntry<FilePath>(FileText, 'Read file', (a) => a.path),
	write_file: toolEntry<FilePath>(FilePlus, 'Write file', (a) => a.path),
	edit_file: toolEntry<FilePath>(Pencil, 'Edit file', (a) => a.path),
	glob: toolEntry<GlobArgs>(FolderSearch, 'Search files', (a) =>
		Array.isArray(a.pattern) ? a.pattern.join(', ') : a.pattern,
	),
	spawn: toolEntry(GitBranch, 'Spawn agent'),
	add_todo: toolEntry<TodoText>(ListPlus, 'Add todo', (a) => a.text),
	complete_todo: toolEntry(ListChecks, 'Complete todo'),
	list_todos: toolEntry(List, 'List todos'),
	'*': {
		summary: ({ block }) => (
			<>
				<Wrench className="h-3 w-3 shrink-0" />
				<span>{block.call.name}</span>
			</>
		),
	},
});
