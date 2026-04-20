import {
	type UsageTracker,
	decorateTurn,
	trackUsage,
} from '@franklin/mini-acp';
import type { ProtocolDecorator } from '../decorator.js';
import type { CoreState } from '../../state.js';

/**
 * Seeds a UsageTracker from persisted CoreState and wraps the client so
 * per-turn usage accumulates into the tracker. The tracker's running total
 * is later snapshotted back into CoreState for persistence.
 */
export function createUsageTrackerDecorator(
	state: CoreState,
	tracker: UsageTracker,
): ProtocolDecorator {
	return {
		name: 'usage-tracker',
		async server(s) {
			return s;
		},
		async client(c) {
			tracker.add(state.core.usage);
			return decorateTurn(c, (turn) => trackUsage(tracker, turn));
		},
	};
}
