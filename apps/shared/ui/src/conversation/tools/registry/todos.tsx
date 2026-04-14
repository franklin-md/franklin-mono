import { List, ListChecks, ListPlus } from 'lucide-react';

import { todoExtension } from '@franklin/extensions';
import type { ToolRendererRegistryEntries } from '@franklin/react';

import { ToolSummaryDetail } from '../summary.js';
import { toolEntry } from '../entry.js';

export const todoToolRenderers = [
	toolEntry(todoExtension.tools.addTodo, ListPlus, 'Add todo', (args) => (
		<ToolSummaryDetail>{args.text}</ToolSummaryDetail>
	)),
	toolEntry(todoExtension.tools.completeTodo, ListChecks, 'Complete todo'),
	toolEntry(todoExtension.tools.listTodos, List, 'List todos'),
] satisfies ToolRendererRegistryEntries;
