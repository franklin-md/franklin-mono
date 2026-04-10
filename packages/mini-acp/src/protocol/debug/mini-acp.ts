import type { MuAgent, MuClient } from '../types.js';

import { debugAgent } from './agent.js';
import { debugClient } from './client.js';

/**
 * Decorates a Mini-ACP client or agent with minimal, colored protocol logging.
 */
export function debugMiniACP(client: MuClient, label?: string): MuClient;
export function debugMiniACP(agent: MuAgent, label?: string): MuAgent;
export function debugMiniACP(
	endpoint: MuClient | MuAgent,
	label = 'debug',
): MuClient | MuAgent {
	return isMuClient(endpoint)
		? debugClient(endpoint, label)
		: debugAgent(endpoint, label);
}

function isMuClient(endpoint: MuClient | MuAgent): endpoint is MuClient {
	return 'initialize' in endpoint;
}
