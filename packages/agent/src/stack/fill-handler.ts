import { RequestError } from '@agentclientprotocol/sdk';

import type { AgentEvents } from '../types.js';
import { EVENT_METHODS, NOTIFICATION_METHODS } from '../types.js';

export function fillHandler(handler: Partial<AgentEvents>): AgentEvents {
	const result: Record<string, unknown> = {};
	for (const method of EVENT_METHODS) {
		result[method] =
			handler[method] ??
			(NOTIFICATION_METHODS.has(method)
				? async () => {}
				: async () => {
						throw RequestError.methodNotFound(method);
					});
	}
	return result as unknown as AgentEvents;
}
