import type { ManagedAgentCommand } from './command.js';
import type { ManagedAgentEvent } from './event.js';

export type { ManagedAgentCommand } from './command.js';
export type { ManagedAgentEvent } from './event.js';
export type { InputItem } from './input.js';
export type {
	ItemCompleted,
	ItemCompletedEvent,
	ItemDelta,
	ItemDeltaEvent,
	ItemKind,
	ItemStarted,
	ItemStartedEvent,
} from './item.js';
export type {
	PermissionDecision,
	PermissionRequest,
	PermissionResolution,
} from './permission.js';
export type { ManagedAgentCommandResult } from './result.js';
export type { SessionRef, SessionSpec } from './session.js';
export type { ManagedAgentError } from './shared.js';

export type ManagedAgentInboundMessage = ManagedAgentCommand;
export type ManagedAgentOutboundMessage = ManagedAgentEvent;
export type ManagedAgentMessage =
	| ManagedAgentInboundMessage
	| ManagedAgentOutboundMessage;
