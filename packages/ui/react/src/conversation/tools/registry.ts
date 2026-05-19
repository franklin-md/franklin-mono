import type { ToolArgs, ToolSpec } from '@franklin/agent';

import type {
	ToolRendererBinding,
	ToolRendererEntry,
	ToolRendererRegistry,
	ToolRendererRegistryEntries,
} from './types.js';

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
): ToolRendererEntry | null {
	return registry.get(toolName) ?? registry.get('*') ?? null;
}
