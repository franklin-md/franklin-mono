import type {
	ItemCompletedEvent,
	ItemDeltaEvent,
	ItemStartedEvent,
} from './item.js';
import type { PermissionRequest, PermissionResolution } from './permission.js';
import type { ManagedAgentError } from './shared.js';

export type ManagedAgentEvent =
	| ItemStartedEvent
	| ItemDeltaEvent
	| ItemCompletedEvent
	| {
			type: 'permission.requested';
			payload: PermissionRequest;
	  }
	| {
			type: 'permission.resolved';
			payload: PermissionResolution;
	  }
	| {
			type: 'turn.completed';
	  }
	| {
			type: 'error';
			error: ManagedAgentError;
	  }
	| {
			type: 'agent.exited';
	  };
