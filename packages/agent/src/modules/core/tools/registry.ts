import type { ToolCall, ToolDefinition } from '@franklin/mini-acp';

import { copyToolFilter, emptyToolFilter, type ToolFilter } from '../state.js';
import type { BoundTool } from '../registrations/tools.js';
import { executeBoundToolCall } from './execute.js';
import { errorExecutionResult, type ToolExecutionResult } from './result.js';
import { serializeTool } from './serialize.js';

export class ToolRegistry {
	private readonly tools: readonly BoundTool[];
	private readonly disabled: Set<string>;

	constructor(input: {
		readonly tools: readonly BoundTool[];
		readonly toolFilter: ToolFilter;
	}) {
		this.tools = input.tools;
		this.disabled = new Set(input.toolFilter.disabled);
	}

	definitions(): ToolDefinition[] {
		return this.tools.filter((tool) => this.enabled(tool)).map(serializeTool);
	}

	filter(): ToolFilter {
		return copyToolFilter({ disabled: [...this.disabled] });
	}

	setEnabled(name: string, enabled: boolean): void {
		if (enabled) {
			this.disabled.delete(name);
			return;
		}
		if (this.disabled.has(name)) return;
		this.disabled.add(name);
	}

	async dispatch(call: ToolCall): Promise<ToolExecutionResult | undefined> {
		const tool = this.toolFor(call.name);
		if (!tool) return undefined;
		if (!this.enabled(tool)) {
			return errorExecutionResult(call, `Tool "${call.name}" is disabled.`);
		}
		return executeBoundToolCall(tool, call, call.arguments);
	}

	private toolFor(name: string): BoundTool | undefined {
		// TODO: define duplicate tool-name policy at the registry boundary.
		return this.tools.find((tool) => tool.name === name);
	}

	private enabled(tool: BoundTool): boolean {
		return !this.disabled.has(tool.name);
	}
}

export function createToolRegistry(
	tools: readonly BoundTool[],
	toolFilter: ToolFilter = emptyToolFilter(),
): ToolRegistry {
	return new ToolRegistry({
		tools,
		toolFilter,
	});
}
