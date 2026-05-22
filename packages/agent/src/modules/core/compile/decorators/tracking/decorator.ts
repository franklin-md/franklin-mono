import {
	decorateTurn,
	trackAgent,
	trackClient,
	trackUsage,
} from '@franklin/mini-acp/session';
import type { AgentState } from '../../../agent-state/index.js';
import type { ProtocolDecorator } from '../types.js';

export function createTrackingDecorator(
	agentState: AgentState,
): ProtocolDecorator {
	return {
		name: 'tracking',
		async server(s) {
			return trackAgent(agentState.contextTracker, s);
		},
		async client(c) {
			const usageTracked = decorateTurn(c, (turn) =>
				trackUsage(agentState.usageTracker, turn),
			);
			return trackClient(agentState.contextTracker, usageTracked);
		},
	};
}
