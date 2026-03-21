import type { McpTransport } from '@franklin/local-mcp';

import type { AgentMiddleware } from '../../types.js';
import type { CollectedState } from './collect.js';

// ---------------------------------------------------------------------------
// buildMiddleware — construct AgentMiddleware from collected state + transport
// ---------------------------------------------------------------------------

export function buildMiddleware(
	_state: CollectedState,
	transport: McpTransport | undefined,
): AgentMiddleware {
	// BROKEN, NEED TO REIMPLEMENT
	return (agentTransport) => {
		return {
			...agentTransport,
			close: async () => {
				await transport?.dispose();
			},
		};
	};
}
