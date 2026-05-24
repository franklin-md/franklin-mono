import { createObserver } from '@franklin/lib';
import type { Observer } from '@franklin/lib';
import type { MiniACPAgent } from '@franklin/mini-acp';
import type { ToolCallEvent, ToolResultEvent } from '../api/handlers.js';
import type { CoreRegistry } from '../registrations/index.js';
import type { ToolRegistry } from '../tools/index.js';
import { fallbackExecutionResult } from '../tools/result.js';
import type { AgentSession } from './session.js';
import { fallbackServer } from './fallback.js';

type ToolObservers = {
	readonly toolCall: Observer<[ToolCallEvent]>;
	readonly toolResult: Observer<[ToolResultEvent]>;
};

type CreateControllerServerInput = {
	readonly registrations: CoreRegistry;
	readonly session: AgentSession;
	readonly toolRegistry: ToolRegistry;
};

export function createControllerServer({
	registrations,
	session,
	toolRegistry,
}: CreateControllerServerInput): MiniACPAgent {
	const observers = createToolObservers(registrations);

	return {
		toolExecute: async (params) => {
			session.recordMessage({
				role: 'assistant',
				content: [params.call],
			});
			observers.toolCall.notify(params);
			const execution =
				(await toolRegistry.dispatch(params.call)) ??
				fallbackExecutionResult(
					await fallbackServer.toolExecute(params),
					params.call,
				);
			observers.toolResult.notify(execution.event);
			session.recordMessage({
				role: 'toolResult',
				toolCallId: execution.modelOutput.toolCallId,
				content: execution.modelOutput.content,
			});
			return execution.modelOutput;
		},
	};
}

function createToolObservers(registrations: CoreRegistry): ToolObservers {
	return {
		toolCall: createObserver(registrations.handlersFor('toolCall')),
		toolResult: createObserver(registrations.handlersFor('toolResult')),
	};
}
