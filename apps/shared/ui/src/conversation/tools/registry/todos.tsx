import { ListTodo } from 'lucide-react';

import { todoExtension } from '@franklin/agent';
import type { ToolRendererRegistryEntries } from '@franklin/react';

import { ToolSummaryDetail } from '../summary.js';
import { toolEntry } from '../entry.js';

export const todoToolRenderers = [
	toolEntry(todoExtension.tools.addTodo, ListTodo, 'Add todo', (args) => (
		<ToolSummaryDetail>{args.text}</ToolSummaryDetail>
	)),
	toolEntry(todoExtension.tools.completeTodo, ListTodo, 'Complete todo'),
	toolEntry(todoExtension.tools.listTodos, ListTodo, 'List todos'),
] satisfies ToolRendererRegistryEntries;
