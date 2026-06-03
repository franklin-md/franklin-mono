import type { ToolDefinition } from '@franklin/mini-acp';
import type { ToolRegistry } from '../../tools/index.js';
import type { SessionDrafter } from './types.js';

export function createToolDefinitionDrafter(
	tools: ToolRegistry,
): SessionDrafter {
	return (context) => {
		const definitions = [...tools.definitions()].sort(compareToolDefinitions);
		// Revision identity assumes registered tool names are unique. Duplicate
		// names still need an explicit policy at the registry boundary.
		context.setTools(definitions, `tools:${JSON.stringify(definitions)}`);
	};
}

function compareToolDefinitions(
	left: ToolDefinition,
	right: ToolDefinition,
): number {
	return left.name.localeCompare(right.name);
}
