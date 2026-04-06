import type { ToolArgs, ToolSpec } from '@franklin/extensions';

import type {
	ToolRendererBinding,
	ToolRendererEntry,
	ToolRendererRegistry,
	ToolRendererRegistryEntries,
} from './types.js';

const fallbackRenderer: ToolRendererEntry = {
	summary: ({ block }) => block.call.name,
};

export function createToolRenderer<S extends ToolSpec>(
	spec: S,
	entry: ToolRendererEntry<ToolArgs<S>>,
): ToolRendererBinding<S> {
	return [spec.name, entry];
}

export function createToolRendererRegistry(
	entries: ToolRendererRegistryEntries,
): ToolRendererRegistry {
	return new Map(entries);
}

export function resolveToolRenderer(
	registry: ToolRendererRegistry,
	toolName: string,
): ToolRendererEntry {
	return registry.get(toolName) ?? registry.get('*') ?? fallbackRenderer;
}
