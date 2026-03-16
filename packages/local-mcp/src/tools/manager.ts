import { serializeTool } from './serialize.js';
import type { AnyToolDefinition, SerializedToolDefinition } from './types.js';

export class ToolsManager {
	private tools: Map<string, AnyToolDefinition> = new Map();

	constructor(tools: AnyToolDefinition[]) {
		for (const tool of tools) {
			this.tools.set(tool.name, tool);
		}
	}

	get(name: string): AnyToolDefinition | undefined {
		return this.tools.get(name);
	}

	listTools(): SerializedToolDefinition[] {
		return Array.from(this.tools.values()).map(serializeTool);
	}
}
