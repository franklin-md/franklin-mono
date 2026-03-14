import { describe, expect, it } from 'vitest';

import type { SessionNotification } from '@franklin/agent';
import type { TranscriptEntry } from '@franklin/react-agents/browser';

import { buildConversationState } from '../conversation.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let entryCounter = 0;

function makeEntry(
	update: SessionNotification['update'],
	sessionId = 'test-session',
): TranscriptEntry {
	return {
		id: `entry-${entryCounter++}`,
		receivedAt: Date.now(),
		notification: { sessionId, update } as SessionNotification,
	};
}

function agentChunk(text: string, messageId?: string): TranscriptEntry {
	return makeEntry({
		sessionUpdate: 'agent_message_chunk',
		content: { type: 'text', text },
		...(messageId != null ? { messageId } : {}),
	} as SessionNotification['update']);
}

function userChunk(text: string, messageId?: string): TranscriptEntry {
	return makeEntry({
		sessionUpdate: 'user_message_chunk',
		content: { type: 'text', text },
		...(messageId != null ? { messageId } : {}),
	} as SessionNotification['update']);
}

function toolCall(toolCallId: string, title: string): TranscriptEntry {
	return makeEntry({
		sessionUpdate: 'tool_call',
		toolCallId,
		title,
		status: 'in_progress',
	} as SessionNotification['update']);
}

function usageUpdate(used: number, size: number): TranscriptEntry {
	return makeEntry({
		sessionUpdate: 'usage_update',
		used,
		size,
	} as SessionNotification['update']);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildConversationState', () => {
	describe('chunk merging with messageId', () => {
		it('merges chunks sharing the same messageId into one message', () => {
			const transcript = [
				agentChunk('Hello ', 'msg-1'),
				agentChunk('world!', 'msg-1'),
			];

			const state = buildConversationState(transcript);

			const messages = state.items.filter((i) => i.kind === 'message');
			expect(messages).toHaveLength(1);
			expect(messages[0]!.data.text).toBe('Hello world!');
			expect(messages[0]!.data.role).toBe('assistant');
		});

		it('creates separate messages for different messageIds', () => {
			const transcript = [
				agentChunk('First.', 'msg-1'),
				agentChunk('Second.', 'msg-2'),
			];

			const state = buildConversationState(transcript);

			const messages = state.items.filter((i) => i.kind === 'message');
			expect(messages).toHaveLength(2);
			expect(messages[0]!.data.text).toBe('First.');
			expect(messages[1]!.data.text).toBe('Second.');
		});
	});

	describe('chunk merging without messageId (consecutive same-role)', () => {
		it('merges consecutive agent chunks without messageId into one message', () => {
			const transcript = [
				agentChunk('Hello '),
				agentChunk('world!'),
			];

			const state = buildConversationState(transcript);

			const messages = state.items.filter((i) => i.kind === 'message');
			expect(messages).toHaveLength(1);
			expect(messages[0]!.data.text).toBe('Hello world!');
			expect(messages[0]!.data.role).toBe('assistant');
		});

		it('merges consecutive user chunks without messageId into one message', () => {
			const transcript = [
				userChunk('part one '),
				userChunk('part two'),
			];

			const state = buildConversationState(transcript);

			const messages = state.items.filter((i) => i.kind === 'message');
			expect(messages).toHaveLength(1);
			expect(messages[0]!.data.text).toBe('part one part two');
			expect(messages[0]!.data.role).toBe('user');
		});

		it('splits when role changes (user → agent)', () => {
			const transcript = [
				userChunk('Question?'),
				agentChunk('Answer.'),
			];

			const state = buildConversationState(transcript);

			const messages = state.items.filter((i) => i.kind === 'message');
			expect(messages).toHaveLength(2);
			expect(messages[0]!.data.role).toBe('user');
			expect(messages[1]!.data.role).toBe('assistant');
		});

		it('resumes merging after a tool call interruption within same messageId', () => {
			// With messageId, chunks should still merge even across tool calls
			const transcript = [
				agentChunk('Before ', 'msg-1'),
				toolCall('tc-1', 'Read file'),
				agentChunk('after.', 'msg-1'),
			];

			const state = buildConversationState(transcript);

			const messages = state.items.filter((i) => i.kind === 'message');
			expect(messages).toHaveLength(1);
			expect(messages[0]!.data.text).toBe('Before after.');
		});

		it('does NOT merge across a tool call when messageId is absent', () => {
			const transcript = [
				agentChunk('Before.'),
				toolCall('tc-1', 'Read file'),
				agentChunk('After.'),
			];

			const state = buildConversationState(transcript);

			const messages = state.items.filter((i) => i.kind === 'message');
			expect(messages).toHaveLength(2);
			expect(messages[0]!.data.text).toBe('Before.');
			expect(messages[1]!.data.text).toBe('After.');
		});

		it('does NOT merge across a usage_update when messageId is absent', () => {
			const transcript = [
				agentChunk('Part 1.'),
				usageUpdate(100, 200000),
				agentChunk('Part 2.'),
			];

			const state = buildConversationState(transcript);

			const messages = state.items.filter((i) => i.kind === 'message');
			// Usage updates don't create items, but they should still break
			// the consecutive run — these are separate logical messages
			expect(messages).toHaveLength(2);
			expect(messages[0]!.data.text).toBe('Part 1.');
			expect(messages[1]!.data.text).toBe('Part 2.');
		});
	});

	describe('streaming state', () => {
		it('marks the last chunk message as streaming', () => {
			const transcript = [agentChunk('streaming...')];

			const state = buildConversationState(transcript);

			expect(state.isStreaming).toBe(true);
			const messages = state.items.filter((i) => i.kind === 'message');
			expect(messages[0]!.data.isStreaming).toBe(true);
		});

		it('is not streaming when transcript ends with a non-chunk event', () => {
			const transcript = [
				agentChunk('done.'),
				usageUpdate(100, 200000),
			];

			const state = buildConversationState(transcript);

			expect(state.isStreaming).toBe(false);
		});
	});

	describe('tool calls', () => {
		it('creates tool call items', () => {
			const transcript = [toolCall('tc-1', 'Write file')];

			const state = buildConversationState(transcript);

			expect(state.items).toHaveLength(1);
			expect(state.items[0]!.kind).toBe('tool_call');
			if (state.items[0]!.kind === 'tool_call') {
				expect(state.items[0]!.data.toolCallId).toBe('tc-1');
				expect(state.items[0]!.data.title).toBe('Write file');
			}
		});
	});
});
