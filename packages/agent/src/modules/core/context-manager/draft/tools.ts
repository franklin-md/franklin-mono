import type { ToolRegistry } from '../../tools/index.js';
import type { SessionDrafter } from './types.js';

export function createToolDefinitionDrafter(
	tools: ToolRegistry,
): SessionDrafter {
	return (context) => {
		context.setTools(tools.definitions(), `tools:${tools.revision()}`);
	};
}
