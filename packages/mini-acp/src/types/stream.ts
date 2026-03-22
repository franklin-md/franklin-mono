import type { Content } from './content.js';
import type { Message } from './message.js';

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
	// TODO: reason instead of error?
	// https://agentclientprotocol.com/protocol/prompt-turn#stop-reasons
	error?: {
		code: number;
		message: string;
	};
};

export type StreamEvent = TurnStart | Chunk | Update | TurnEnd;
