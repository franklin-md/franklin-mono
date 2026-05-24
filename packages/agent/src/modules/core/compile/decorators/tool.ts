import { createObserver } from '@franklin/lib';
import type { Observer } from '@franklin/lib';
import type { MiniACPAgent } from '@franklin/mini-acp';
import type { ToolCallEvent, ToolResultEvent } from '../../api/handlers.js';
import type { CoreRegistry } from '../../registrations/index.js';
import type { ToolRegistry } from '../../tools/index.js';
import { fallbackExecutionResult } from '../../tools/result.js';
import type { ProtocolDecorator } from './types.js';

type ToolObservers = {
	readonly toolCall: Observer<[ToolCallEvent]>;
	readonly toolResult: Observer<[ToolResultEvent]>;
};

export function createToolDecorator(
	registry: ToolRegistry,
	registrations: CoreRegistry,
): ProtocolDecorator | undefined {
	const observers = createToolObservers(registrations);
	const hasObserverRegistrations =
		observers.toolCall.listenerCount > 0 ||
		observers.toolResult.listenerCount > 0;
	if (registrations.tools.length === 0 && !hasObserverRegistrations) {
		return undefined;
	}

	return {
		name: 'tool',
		async server(server): Promise<MiniACPAgent> {
			const toolExecute: MiniACPAgent['toolExecute'] = async (params) => {
				observers.toolCall.notify(params);
				const execution =
					(await registry.dispatch(params.call)) ??
					fallbackExecutionResult(
						await server.toolExecute(params),
						params.call,
					);
				observers.toolResult.notify(execution.event);
				return execution.modelOutput;
			};

			return {
				...server,
				toolExecute,
			};
		},
		async client(c) {
			return c;
		},
	};
}

function createToolObservers(registrations: CoreRegistry): ToolObservers {
	return {
		toolCall: createObserver(registrations.handlersFor('toolCall')),
		toolResult: createObserver(registrations.handlersFor('toolResult')),
	};
}
