import type { MuAgent, MuClient } from '../types.js';

import { debugAgent } from './agent.js';
import { debugClient } from './client.js';

let nextId = 1;

function getNextLabel(type: 'agent' | 'client'): string {
	return `${type}-${nextId++}`;
}

/**
 * Decorates a Mini-ACP client or agent with minimal, colored protocol logging.
 */
export function debugMiniACP(client: MuClient, label?: string): MuClient;
export function debugMiniACP(agent: MuAgent, label?: string): MuAgent;
export function debugMiniACP(
	endpoint: MuClient | MuAgent,
	label?: string,
): MuClient | MuAgent {
	const finalLabel =
		label ?? getNextLabel(isMuClient(endpoint) ? 'client' : 'agent');
	return isMuClient(endpoint)
		? debugClient(endpoint, finalLabel)
		: debugAgent(endpoint, finalLabel);
}

function isMuClient(endpoint: MuClient | MuAgent): endpoint is MuClient {
	return 'initialize' in endpoint;
}
