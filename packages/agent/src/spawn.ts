import { RequestError } from '@agentclientprotocol/sdk';

import type { AgentCommands, AgentEvents } from './types.js';
import type { Middleware } from './stack/index.js';
import { emptyMiddleware, sequence } from './stack/index.js';
import { EVENT_METHODS } from './stack/index.js';

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

export function composeAll(middlewares: readonly Middleware[]): Middleware {
	return middlewares.reduce((acc, mw) => sequence(acc, mw), emptyMiddleware);
}

export interface SpawnOptions {
	cwd: string;
	middlewares?: Middleware[];
	handler: Partial<AgentEvents>;
}

export interface AgentSession {
	commands: AgentCommands;
	sessionId: string;
	dispose(): Promise<void>;
}
