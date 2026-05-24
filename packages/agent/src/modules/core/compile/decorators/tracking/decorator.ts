import {
	decorateTurn,
	trackAgent,
	trackClient,
	trackUsage,
} from '@franklin/mini-acp/session';
import type { ContextManager } from '../../../context-manager/index.js';
import type { ProtocolDecorator } from '../types.js';

export function createTrackingDecorator(
	contextManager: ContextManager,
): ProtocolDecorator {
	return {
		name: 'tracking',
		async server(s) {
			return trackAgent(contextManager.contextRecorder, s);
		},
		async client(c) {
			const usageTracked = decorateTurn(c, (turn) =>
				trackUsage(contextManager.usageTracker, turn),
			);
			return trackClient(contextManager.contextRecorder, usageTracked);
		},
	};
}
