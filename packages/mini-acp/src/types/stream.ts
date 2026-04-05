import type { Content } from './content.js';
import type { Message } from './message.js';
import type { StopCode } from './stop-code.js';

// ---------------------------------------------------------------------------
// Stream events — emitted during a prompt turn
// ---------------------------------------------------------------------------

export type TurnStart = {
	type: 'turnStart';
};

// A streaming delta — part of a message being built up incrementally.
// All chunks sharing the same messageId belong to the same logical message.
export type Chunk = {
	type: 'chunk';
	messageId: string;
	role: Message['role'];
	content: Content;
};

// The authoritative, complete form of an assistant message.
// If chunks were emitted for this messageId, the message content is the
// concatenation of those chunk deltas (grouped by content type).
// Tool calls/results are not streamed as Update events; they flow through
// toolExecute/toolResult instead.
export type Update = {
	type: 'update';
	messageId: string;
	message: Message;
};

export type TurnEnd = {
	type: 'turnEnd';
	stopCode: StopCode;
	stopMessage?: string;
};

export type StreamEvent = TurnStart | Chunk | Update | TurnEnd;
