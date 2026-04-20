import {
	type UsageTracker,
	decorateTurn,
	trackUsage,
} from '@franklin/mini-acp';
import type { ProtocolDecorator } from './types.js';

/**
 * Wraps the client so per-turn usage accumulates into the given tracker.
 * The tracker must be seeded from persisted state by the caller before
 * the decorator stack is applied.
 */
export function createUsageTrackerDecorator(
	tracker: UsageTracker,
): ProtocolDecorator {
	return {
		name: 'usage-tracker',
		async server(s) {
			return s;
		},
		async client(c) {
			return decorateTurn(c, (turn) => trackUsage(tracker, turn));
		},
	};
}
