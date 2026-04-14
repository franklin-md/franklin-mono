import { Wrench } from 'lucide-react';

import {
	createToolRendererRegistry,
	type ToolRendererEntry,
	type ToolRendererRegistryEntries,
} from '@franklin/react';

import { ToolSummary } from '../summary.js';
import { agentToolRenderers } from './agents.js';
import { executionToolRenderers } from './execution.js';
import { fileToolRenderers } from './files.js';
import { todoToolRenderers } from './todos.js';
import { webToolRenderers } from './web.js';

const fallbackEntry: ToolRendererEntry = {
	summary: ({ block }) => <ToolSummary icon={Wrench} label={block.call.name} />,
};

export const defaultToolRenderers = [
	...fileToolRenderers,
	...executionToolRenderers,
	...agentToolRenderers,
	...webToolRenderers,
	...todoToolRenderers,
	['*', fallbackEntry],
] satisfies ToolRendererRegistryEntries;

export const defaultToolRegistry =
	createToolRendererRegistry(defaultToolRenderers);
