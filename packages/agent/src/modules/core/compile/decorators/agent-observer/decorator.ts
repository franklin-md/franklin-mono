import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { MiniACPClient } from '@franklin/mini-acp';
import type { CoreSignature } from '../../../api/api.js';
import { bindRegisteredEventHandlers } from '../../registrations/index.js';
import type { ProtocolDecorator } from '../types.js';
import { observePromptStream } from './prompt.js';
import type { AgentStreamObservers } from './types.js';

export function buildAgentStreamObservers<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getCtx: () => Runtime,
): AgentStreamObservers {
	return {
		turnStart: bindRegisteredEventHandlers(registrations, 'turnStart', getCtx),
		chunk: bindRegisteredEventHandlers(registrations, 'chunk', getCtx),
		update: bindRegisteredEventHandlers(registrations, 'update', getCtx),
		turnEnd: bindRegisteredEventHandlers(registrations, 'turnEnd', getCtx),
	};
}

export function hasAnyAgentStreamObserver(
	observers: AgentStreamObservers,
): boolean {
	return (
		observers.turnStart.length > 0 ||
		observers.chunk.length > 0 ||
		observers.update.length > 0 ||
		observers.turnEnd.length > 0
	);
}

export function createAgentObserverDecorator<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getCtx: () => Runtime,
): ProtocolDecorator | undefined {
	const observers = buildAgentStreamObservers(registrations, getCtx);
	if (!hasAnyAgentStreamObserver(observers)) return undefined;

	return {
		name: 'agent-observer',
		async server(s) {
			return s;
		},
		async client(c): Promise<MiniACPClient> {
			return {
				...c,
				prompt(message) {
					return observePromptStream(c.prompt(message), observers);
				},
			} as MiniACPClient;
		},
	};
}
