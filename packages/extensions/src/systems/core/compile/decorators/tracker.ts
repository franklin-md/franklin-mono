import { type CtxTracker, trackAgent, trackClient } from '@franklin/mini-acp';
import type { ProtocolDecorator } from './types.js';

export function createTrackerDecorator(tracker: CtxTracker): ProtocolDecorator {
	return {
		name: 'tracker',
		async server(s) {
			return trackAgent(tracker, s);
		},
		async client(c) {
			return trackClient(tracker, c);
		},
	};
}
