import type { MiniACPAgent } from '@franklin/mini-acp';
import { apply, passThrough, type Middleware } from '@franklin/lib/middleware';
import type { ProtocolDecorator } from '../types.js';
import type { ToolRegistry } from './registry.js';

type ServerMiddleware = Middleware<MiniACPAgent>;

export function buildToolServerMiddleware(
	registry: ToolRegistry,
): ServerMiddleware {
	return serverMiddlewareFromRegistry(registry);
}

export function createToolDecorator(
	registry: ToolRegistry,
): ProtocolDecorator | undefined {
	if (!registry.hasRegistrations()) return undefined;

	return {
		name: 'tool',
		async server(s) {
			return apply(serverMiddlewareFromRegistry(registry), s);
		},
		async client(c) {
			return c;
		},
	};
}

function serverMiddlewareFromRegistry(
	registry: ToolRegistry,
): ServerMiddleware {
	return {
		toolExecute: registry.hasRegistrations()
			? registry.createHandler()
			: passThrough<MiniACPAgent['toolExecute']>(),
	};
}
