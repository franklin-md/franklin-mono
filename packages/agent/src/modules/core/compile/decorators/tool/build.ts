import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { CoreSignature } from '../../../api/api.js';
import {
	bindRegisteredEventHandlers,
	registeredTools,
} from '../../registrations/index.js';
import type { ToolLayer, ToolObservers } from './types.js';

export function buildToolLayer<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): ToolLayer<Runtime> {
	return {
		tools: registeredTools(registrations),
		observers: {
			toolCall: bindRegisteredEventHandlers(
				registrations,
				'toolCall',
				getRuntime,
			),
			toolResult: bindRegisteredEventHandlers(
				registrations,
				'toolResult',
				getRuntime,
			),
		},
		getRuntime,
	};
}

function hasAnyToolObserver(observers: ToolObservers): boolean {
	return observers.toolCall.length > 0 || observers.toolResult.length > 0;
}

export function hasAnyToolLayer<Runtime extends BaseRuntime>(
	layer: ToolLayer<Runtime>,
): boolean {
	return layer.tools.length > 0 || hasAnyToolObserver(layer.observers);
}
