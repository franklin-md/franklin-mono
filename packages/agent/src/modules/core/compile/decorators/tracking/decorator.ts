import {
	decorateTurn,
	trackAgent,
	trackClient,
	trackUsage,
} from '@franklin/mini-acp/session';
import type { CoreResources } from '../../resources.js';
import type { ProtocolDecorator } from '../types.js';

export function createTrackingDecorator(
	resources: Pick<CoreResources, 'tracker' | 'usageTracker'>,
): ProtocolDecorator {
	return {
		name: 'tracking',
		async server(s) {
			return trackAgent(resources.tracker, s);
		},
		async client(c) {
			const usageTracked = decorateTurn(c, (turn) =>
				trackUsage(resources.usageTracker, turn),
			);
			return trackClient(resources.tracker, usageTracked);
		},
	};
}
