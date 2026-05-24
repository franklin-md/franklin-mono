import { createObserver } from '@franklin/lib';
import type { Observer } from '@franklin/lib';
import type {
	MiniACPAgent,
	ToolDefinition,
	ToolExecuteParams,
	ToolResult,
} from '@franklin/mini-acp';

import type { ToolCallEvent, ToolResultEvent } from '../api/handlers.js';
import { copyToolFilter, emptyToolFilter, type ToolFilter } from '../state.js';
import type { CoreRegistry } from '../registrations/index.js';
import type { BoundTool } from '../registrations/tools.js';
import { executeBoundToolCall } from './execute.js';
import { errorExecutionResult, fallbackExecutionResult } from './result.js';
import { serializeTool } from './serialize.js';

type ToolObservers = {
	readonly toolCall: Observer<[ToolCallEvent]>;
	readonly toolResult: Observer<[ToolResultEvent]>;
};

export class ToolRegistry {
	private readonly tools: readonly BoundTool[];
	private readonly observers: ToolObservers;
	private readonly disabled: Set<string>;
	private version = 0;

	constructor(input: {
		readonly tools: readonly BoundTool[];
		readonly observers: ToolObservers;
		readonly toolFilter: ToolFilter;
	}) {
		this.tools = input.tools;
		this.observers = input.observers;
		this.disabled = new Set(input.toolFilter.disabled);
	}

	hasRegistrations(): boolean {
		return this.tools.length > 0 || this.hasObservers();
	}

	definitions(): ToolDefinition[] {
		return this.tools.filter((tool) => this.enabled(tool)).map(serializeTool);
	}

	filter(): ToolFilter {
		return copyToolFilter({ disabled: [...this.disabled] });
	}

	revision(): number {
		return this.version;
	}

	setEnabled(name: string, enabled: boolean): void {
		if (enabled) {
			if (this.disabled.delete(name)) this.version += 1;
			return;
		}
		if (this.disabled.has(name)) return;
		this.disabled.add(name);
		this.version += 1;
	}

	async dispatch(
		params: ToolExecuteParams,
		next: MiniACPAgent['toolExecute'],
	): Promise<ToolResult> {
		this.observers.toolCall.notify(params);

		const tool = this.toolFor(params.call.name);
		const execution =
			tool && this.enabled(tool)
				? await executeBoundToolCall(tool, params.call, params.call.arguments)
				: tool
					? errorExecutionResult(
							params.call,
							`Tool "${params.call.name}" is disabled.`,
						)
					: fallbackExecutionResult(await next(params), params.call);

		this.observers.toolResult.notify(execution.event);

		return execution.modelOutput;
	}

	private hasObservers(): boolean {
		return (
			this.observers.toolCall.listenerCount > 0 ||
			this.observers.toolResult.listenerCount > 0
		);
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
	registrations: CoreRegistry,
	toolFilter: ToolFilter = emptyToolFilter(),
): ToolRegistry {
	return new ToolRegistry({
		tools: registrations.tools,
		observers: {
			toolCall: createObserver(registrations.handlersFor('toolCall')),
			toolResult: createObserver(registrations.handlersFor('toolResult')),
		},
		toolFilter,
	});
}
