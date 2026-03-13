import { describe, expect, it } from 'vitest';

import type { SessionNotification } from '@franklin/agent';
import type { TranscriptEntry } from '@franklin/react-agents';

import { projectTranscript } from '../lib/project-transcript.js';

function entry(
	id: string,
	notification: SessionNotification,
): TranscriptEntry {
	return {
		id,
		receivedAt: 1,
		notification,
	};
}

function agentMessageChunk(text: string): SessionNotification {
	return {
		sessionId: 'test-session',
		update: {
			sessionUpdate: 'agent_message_chunk',
			content: { type: 'text', text },
		},
	} as SessionNotification;
}

function userMessageChunk(text: string): SessionNotification {
	return {
		sessionId: 'test-session',
		update: {
			sessionUpdate: 'user_message_chunk',
			content: { type: 'text', text },
		},
	} as SessionNotification;
}

function agentThoughtChunk(text: string): SessionNotification {
	return {
		sessionId: 'test-session',
		update: {
			sessionUpdate: 'agent_thought_chunk',
			content: { type: 'text', text },
		},
	} as SessionNotification;
}

function toolCallNotification(
	toolCallId: string,
	title: string,
	status = 'in_progress',
): SessionNotification {
	return {
		sessionId: 'test-session',
		update: {
			sessionUpdate: 'tool_call',
			toolCallId,
			title,
			status,
		},
	} as SessionNotification;
}

function toolCallUpdateNotification(
	toolCallId: string,
	status: string,
): SessionNotification {
	return {
		sessionId: 'test-session',
		update: {
			sessionUpdate: 'tool_call_update',
			toolCallId,
			status,
		},
	} as SessionNotification;
}

describe('projectTranscript', () => {
	it('merges consecutive agent message chunks', () => {
		const items = projectTranscript(
			[
				entry('1', agentMessageChunk('hello')),
				entry('2', agentMessageChunk(' world')),
			],
			{ isRunning: true },
		);

		expect(items).toEqual([
			{
				id: '1',
				kind: 'agent_message',
				text: 'hello world',
				streaming: true,
			},
		]);
	});

	it('merges consecutive user message chunks', () => {
		const items = projectTranscript([entry('1', userMessageChunk('hello'))], {
			isRunning: false,
		});

		expect(items).toEqual([
			{
				id: '1',
				kind: 'user_message',
				text: 'hello',
				streaming: false,
			},
		]);
	});

	it('flushes accumulated text when the kind changes', () => {
		const items = projectTranscript(
			[
				entry('1', agentThoughtChunk('thinking')),
				entry('2', agentMessageChunk('answer')),
			],
			{ isRunning: true },
		);

		expect(items).toEqual([
			{
				id: '1',
				kind: 'agent_thought',
				text: 'thinking',
				streaming: false,
			},
			{
				id: '2',
				kind: 'agent_message',
				text: 'answer',
				streaming: true,
			},
		]);
	});

	it('adds and updates tool calls', () => {
		const items = projectTranscript([
			entry('1', toolCallNotification('tc-1', 'Read file')),
			entry('2', toolCallUpdateNotification('tc-1', 'completed')),
		]);

		expect(items).toEqual([
			{
				id: 'tc-1',
				kind: 'tool_call',
				streaming: false,
				toolTitle: 'Read file',
				toolStatus: 'completed',
			},
		]);
	});

	it('flushes accumulated text before a tool call', () => {
		const items = projectTranscript(
			[
				entry('1', agentMessageChunk('partial')),
				entry('2', toolCallNotification('tc-1', 'Search')),
			],
			{ isRunning: true },
		);

		expect(items).toEqual([
			{
				id: '1',
				kind: 'agent_message',
				text: 'partial',
				streaming: false,
			},
			{
				id: 'tc-1',
				kind: 'tool_call',
				streaming: false,
				toolTitle: 'Search',
				toolStatus: 'in_progress',
			},
		]);
	});
});
