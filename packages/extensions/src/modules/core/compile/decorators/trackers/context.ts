import {
	type ContextTracker,
	trackAgent,
	trackClient,
} from '@franklin/mini-acp';
import type { ProtocolDecorator } from '../types.js';

export function createContextTrackerDecorator(
	tracker: ContextTracker,
): ProtocolDecorator {
	return {
		name: 'context-tracker',
		async server(s) {
			return trackAgent(tracker, s);
		},
		async client(c) {
			return trackClient(tracker, c);
		},
	};
}
