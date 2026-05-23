import type {
	BaseRuntime,
	EffectValueForName,
	RegistryView,
} from '@franklin/extensibility';
import { createObserver } from '@franklin/lib';
import type { MethodMiddleware } from '@franklin/lib/middleware';
import type {
	MiniACPAgent,
	ToolDefinition,
	ToolExecuteParams,
	ToolResult,
} from '@franklin/mini-acp';

import type { CoreSignature } from '../../../api/api.js';
import { defaultToolRenderOutput } from '../../../api/tool.js';
import {
	copyToolFilter,
	emptyToolFilter,
	type ToolFilter,
} from '../../../state.js';
import { createCoreEventRegistrations } from '../../registrations/events.js';
import { executeRegisteredToolCall } from './registered.js';
import { errorExecutionResult, fallbackExecutionResult } from './result.js';
import { serializeTool } from './serialize.js';
import type { AnyRegisteredTool, ToolObservers } from './types.js';

type RegisterToolArgs<Runtime extends BaseRuntime> = EffectValueForName<
	CoreSignature,
	Runtime,
	'registerTool'
>;

export class ToolRegistry {
	private readonly tools: readonly AnyRegisteredTool[];
	private readonly observers: ToolObservers;
	private readonly disabled: Set<string>;

	constructor(input: {
		readonly tools: readonly AnyRegisteredTool[];
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

	setEnabled(name: string, enabled: boolean): void {
		if (enabled) {
			this.disabled.delete(name);
			return;
		}
		this.disabled.add(name);
	}

	createHandler(): MethodMiddleware<MiniACPAgent['toolExecute']> {
		return (params, next) => this.dispatch(params, next);
	}

	async dispatch(
		params: ToolExecuteParams,
		next: MiniACPAgent['toolExecute'],
	): Promise<ToolResult> {
		this.observers.toolCall.notify(params);

		const tool = this.toolFor(params.call.name);
		const execution =
			tool && this.enabled(tool)
				? await executeRegisteredToolCall(
						tool,
						params.call,
						params.call.arguments,
					)
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

	private toolFor(name: string): AnyRegisteredTool | undefined {
		// TODO: define duplicate tool-name policy at the registry boundary.
		return this.tools.find((tool) => tool.name === name);
	}

	private enabled(tool: AnyRegisteredTool): boolean {
		return !this.disabled.has(tool.name);
	}
}

export function createToolRegistry<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
	toolFilter: ToolFilter = emptyToolFilter(),
): ToolRegistry {
	const events = createCoreEventRegistrations(registrations, getRuntime);

	return new ToolRegistry({
		tools: registrations
			.argsFor('registerTool')
			.map((registration) => normalizeTool(registration, getRuntime)),
		observers: {
			toolCall: createObserver(events.handlersFor('toolCall')),
			toolResult: createObserver(events.handlersFor('toolResult')),
		},
		toolFilter,
	});
}

function normalizeTool<Runtime extends BaseRuntime>(
	registration: RegisterToolArgs<Runtime>,
	getRuntime: () => Runtime,
): AnyRegisteredTool {
	const [spec, handlers] = registration;
	return {
		name: spec.name,
		description: spec.description,
		schema: spec.schema,
		async run(params) {
			const runtime = getRuntime();
			const output = await handlers.execute(params, runtime);
			const rendered = handlers.render
				? await handlers.render(output, params, runtime)
				: defaultToolRenderOutput(output);
			return { output, rendered };
		},
	};
}
