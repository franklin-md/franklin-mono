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
import { bindRegisteredEventHandlers } from '../../registrations/events.js';
import { executeRegisteredToolCall } from './registered.js';
import { fallbackExecutionResult } from './result.js';
import { serializeTool } from './serialize.js';
import type { AnyRegisteredTool, ToolObservers } from './types.js';

type RegisterToolArgs<Runtime extends BaseRuntime> = EffectValueForName<
	CoreSignature,
	Runtime,
	'registerTool'
>;

export class ToolRegistry<Runtime extends BaseRuntime> {
	private readonly tools: readonly AnyRegisteredTool<Runtime>[];
	private readonly observers: ToolObservers;
	private readonly getRuntime: () => Runtime;

	constructor(input: {
		readonly tools: readonly AnyRegisteredTool<Runtime>[];
		readonly observers: ToolObservers;
		readonly getRuntime: () => Runtime;
	}) {
		this.tools = input.tools;
		this.observers = input.observers;
		this.getRuntime = input.getRuntime;
	}

	hasRegistrations(): boolean {
		return this.tools.length > 0 || this.hasObservers();
	}

	definitions(): ToolDefinition[] {
		return this.tools.map(serializeTool);
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
		const execution = tool
			? await executeRegisteredToolCall(
					tool,
					params.call,
					params.call.arguments,
					this.getRuntime,
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

	private toolFor(name: string): AnyRegisteredTool<Runtime> | undefined {
		// TODO: define duplicate tool-name policy at the registry boundary.
		return this.tools.find((tool) => tool.name === name);
	}
}

export function createToolRegistry<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): ToolRegistry<Runtime> {
	return new ToolRegistry({
		tools: registrations.argsFor('registerTool').map(normalizeTool),
		observers: {
			toolCall: createObserver(
				bindRegisteredEventHandlers(registrations, 'toolCall', getRuntime),
			),
			toolResult: createObserver(
				bindRegisteredEventHandlers(registrations, 'toolResult', getRuntime),
			),
		},
		getRuntime,
	});
}

function normalizeTool<Runtime extends BaseRuntime>(
	registration: RegisterToolArgs<Runtime>,
): AnyRegisteredTool<Runtime> {
	const [spec, handlers] = registration;
	return {
		name: spec.name,
		description: spec.description,
		schema: spec.schema,
		execute: handlers.execute,
		render: handlers.render,
	};
}
