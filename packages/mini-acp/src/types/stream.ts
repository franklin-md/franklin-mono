import type { Content } from './content.js';
import type { Message } from './message.js';
import type { AuthError } from './errors.js';
import type { StopReason } from './stop_reason.js';

// ---------------------------------------------------------------------------
// Stream events — emitted during a prompt turn
// ---------------------------------------------------------------------------

export type TurnStart = {
	type: 'turnStart';
};

export type Update = {
	type: 'update';
	message: Message;
};

export type Chunk = {
	type: 'chunk';
	messageId: string;
	role: Message['role'];
	content: Content;
};

export type TurnEnd = {
	type: 'turnEnd';
	// https://agentclientprotocol.com/protocol/prompt-turn#stop-reasons
	stopReason: StopReason;
	stopMessage?: string;
};

export type StreamEvent = TurnStart | Chunk | Update | TurnEnd;
