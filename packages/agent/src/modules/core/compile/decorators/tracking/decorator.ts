import {
	decorateTurn,
	trackAgent,
	trackClient,
	trackUsage,
} from '@franklin/mini-acp/session';
import type { MutableSession } from '../../../session/index.js';
import type { ProtocolDecorator } from '../types.js';

export function createTrackingDecorator(
	session: MutableSession,
): ProtocolDecorator {
	return {
		name: 'tracking',
		async server(s) {
			return trackAgent(session.contextTracker, s);
		},
		async client(c) {
			const usageTracked = decorateTurn(c, (turn) =>
				trackUsage(session.usageTracker, turn),
			);
			return trackClient(session.contextTracker, usageTracked);
		},
	};
}
