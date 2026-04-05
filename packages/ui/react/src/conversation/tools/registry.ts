import type { ToolRendererEntry, ToolRendererRegistry } from './types.js';

const fallbackRenderer: ToolRendererEntry = {
	summary: ({ block }) => block.call.name,
};

export function createToolRendererRegistry(
	entries: Record<string, ToolRendererEntry>,
): ToolRendererRegistry {
	return new Map(Object.entries(entries));
}

export function resolveToolRenderer(
	registry: ToolRendererRegistry,
	toolName: string,
): ToolRendererEntry {
	return registry.get(toolName) ?? registry.get('*') ?? fallbackRenderer;
}
