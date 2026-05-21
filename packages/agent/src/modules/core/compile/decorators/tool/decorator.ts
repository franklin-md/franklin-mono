import { apply } from '@franklin/lib/middleware';
import type { BaseRuntime } from '@franklin/extensibility';
import type { ProtocolDecorator } from '../types.js';
import type { ToolLayer } from './types.js';
import { buildToolServerMiddleware } from './server.js';

export function createToolDecorator<Runtime extends BaseRuntime>(
	layer: ToolLayer<Runtime>,
): ProtocolDecorator {
	return {
		name: 'tool',
		async server(s) {
			return apply(buildToolServerMiddleware(layer), s);
		},
		async client(c) {
			return c;
		},
	};
}
