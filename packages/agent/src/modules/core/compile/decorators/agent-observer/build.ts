import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { CoreSignature } from '../../../api/api.js';
import { bindRegisteredEventHandlers } from '../../registrations/index.js';
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
