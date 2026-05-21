import type { MiniACPClient } from '@franklin/mini-acp';
import type { ProtocolDecorator } from '../types.js';
import { observePromptStream } from './prompt.js';
import type { AgentStreamObservers } from './types.js';

export function createAgentObserverDecorator(
	observers: AgentStreamObservers,
): ProtocolDecorator {
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
