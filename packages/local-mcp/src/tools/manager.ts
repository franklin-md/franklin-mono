import { serializeTool } from './serialize.js';
import type { AnyToolDefinition, SerializedToolDefinition } from './types.js';

export class ToolsManager {
	private tools: Map<string, AnyToolDefinition> = new Map();

	constructor(tools: AnyToolDefinition[]) {
		for (const tool of tools) {
			this.tools.set(tool.name, tool);
		}
	}

	listTools(): SerializedToolDefinition[] {
		return Array.from(this.tools.values()).map(serializeTool);
	}

	dispatch(name: string, args: unknown): Promise<unknown> {
		const tool = this.tools.get(name);
		if (!tool) {
			throw new Error(`Tool ${name} not found`);
		}
		const parsed: unknown = tool.schema.parse(args);
		return tool.handler(parsed);
	}
}
