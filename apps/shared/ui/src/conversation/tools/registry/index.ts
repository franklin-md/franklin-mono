import {
	createToolRendererRegistry,
	type ToolRendererRegistryEntries,
} from '@franklin/react';

import { executionToolRenderers } from './execution.js';
import { fallbackToolRenderer } from './fallback.js';
import { fileToolRenderers } from './files.js';
import { todoToolRenderers } from './todos.js';
import { webToolRenderers } from './web.js';

export const defaultToolRenderers = [
	...fileToolRenderers,
	...executionToolRenderers,
	...webToolRenderers,
	...todoToolRenderers,
	fallbackToolRenderer,
] satisfies ToolRendererRegistryEntries;

export const defaultToolRegistry =
	createToolRendererRegistry(defaultToolRenderers);
