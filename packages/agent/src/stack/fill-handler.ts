import { RequestError } from '@agentclientprotocol/sdk';

import type { AgentEvents } from '../types.js';
import { EVENT_METHODS } from '../middleware/types.js';

export function fillHandler(handler: Partial<AgentEvents>): AgentEvents {
	const result: Record<string, unknown> = {};
	for (const method of EVENT_METHODS) {
		result[method] =
			handler[method] ??
			(() => {
				throw RequestError.methodNotFound(method);
			});
	}
	return result as unknown as AgentEvents;
}
