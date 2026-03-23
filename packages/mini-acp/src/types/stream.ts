import type { Content } from './content.js';
import type { Message } from './message.js';

// ---------------------------------------------------------------------------
// Stream events — emitted during a prompt turn
// ---------------------------------------------------------------------------

export type TurnStart = {
	type: 'turnStart';
};

// Part of an Update
export type Chunk = {
	type: 'chunk';
	// TODO
	// Not sure we even need messageId...... all messages are for the same turn.
	// Maybe Chunk and Update should both be scoped by TurnId?
	messageId: string;
	role: Message['role'];
	content: Content;
};

// The entirety of the update.
// Should always be equal to sum of all chunks in the update.

export type Update = {
	type: 'update';
	message: Message;
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
