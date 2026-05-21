import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { MiniACPAgent } from '@franklin/mini-acp';
import { apply, passThrough, type Middleware } from '@franklin/lib/middleware';
import type { CoreSignature } from '../../../api/api.js';
import {
	bindRegisteredEventHandlers,
	registeredTools,
} from '../../registrations/index.js';
import type { ProtocolDecorator } from '../types.js';
import { buildToolExecuteMiddleware } from './execute.js';
import type { ToolLayer, ToolObservers } from './types.js';

type ServerMiddleware = Middleware<MiniACPAgent>;

export function buildToolServerMiddleware<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): ServerMiddleware {
	return serverMiddlewareFromLayer(buildToolLayer(registrations, getRuntime));
}

export function createToolDecorator<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): ProtocolDecorator | undefined {
	const layer = buildToolLayer(registrations, getRuntime);
	if (!hasAnyToolLayer(layer)) return undefined;

	return {
		name: 'tool',
		async server(s) {
			return apply(serverMiddlewareFromLayer(layer), s);
		},
		async client(c) {
			return c;
		},
	};
}

function buildToolLayer<Runtime extends BaseRuntime>(
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

function serverMiddlewareFromLayer<Runtime extends BaseRuntime>(
	layer: ToolLayer<Runtime>,
): ServerMiddleware {
	return {
		toolExecute: hasAnyToolLayer(layer)
			? buildToolExecuteMiddleware(layer)
			: passThrough<MiniACPAgent['toolExecute']>(),
	};
}

function hasAnyToolObserver(observers: ToolObservers): boolean {
	return observers.toolCall.length > 0 || observers.toolResult.length > 0;
}

function hasAnyToolLayer<Runtime extends BaseRuntime>(
	layer: ToolLayer<Runtime>,
): boolean {
	return layer.tools.length > 0 || hasAnyToolObserver(layer.observers);
}
