import type { ToolInvocation } from '../api/tool.js';
import type { ToolSource } from '../api/tool-source.js';
import { createToolSources } from './sources.js';
import type { ToolCall, ToolDefinition } from '@franklin/mini-acp';

import { copyToolFilter, emptyToolFilter, type ToolFilter } from '../state.js';
import type { BoundTool } from '../registrations/tools.js';
import { executeBoundToolCall } from './execute.js';
import { errorExecutionResult, type ToolExecutionResult } from './result.js';
import { serializeTool } from './serialize.js';

export class ToolRegistry {
	private readonly tools: readonly BoundTool[];
	private dynamic: readonly BoundTool[] = [];
	private readonly sources;
	private readonly disabled: Set<string>;

	constructor(input: {
		readonly tools: readonly BoundTool[];
		readonly toolFilter: ToolFilter;
		readonly sources?: readonly (() => ToolSource)[];
	}) {
		this.tools = input.tools;
		this.sources = createToolSources(input.sources ?? []);
		this.assertUnique(this.tools);
		this.disabled = new Set(input.toolFilter.disabled);
	}

	definitions(): ToolDefinition[] {
		return [...this.tools, ...this.dynamic]
			.filter((tool) => this.enabled(tool))
			.map(serializeTool);
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

	async dispatch(
		call: ToolCall,
		invocation?: ToolInvocation,
	): Promise<ToolExecutionResult | undefined> {
		const tool = this.toolFor(call.name);
		if (!tool) return undefined;
		if (!this.enabled(tool)) {
			return errorExecutionResult(call, `Tool "${call.name}" is disabled.`);
		}
		return executeBoundToolCall(tool, call, call.arguments, invocation);
	}

	async prepare(signal: AbortSignal): Promise<void> {
		const tools = await this.sources.prepare(signal);
		this.assertUnique([...this.tools, ...tools]);
		this.dynamic = tools;
	}
	async dispose(): Promise<void> {
		await this.sources.dispose();
	}
	private assertUnique(tools: readonly BoundTool[]): void {
		const names = new Set<string>();
		for (const tool of tools) {
			if (names.has(tool.name))
				throw new Error(`Duplicate tool name: ${tool.name}`);
			names.add(tool.name);
		}
	}
	private toolFor(name: string): BoundTool | undefined {
		return [...this.tools, ...this.dynamic].find((tool) => tool.name === name);
	}

	private enabled(tool: BoundTool): boolean {
		return !this.disabled.has(tool.name);
	}
}

export function createToolRegistry(
	tools: readonly BoundTool[],
	toolFilter: ToolFilter = emptyToolFilter(),
	sources: readonly (() => ToolSource)[] = [],
): ToolRegistry {
	return new ToolRegistry({
		tools,
		toolFilter,
		sources,
	});
}
