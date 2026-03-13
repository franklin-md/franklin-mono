import { describe, expect, it, vi } from 'vitest';

import type {
	RequestPermissionRequest,
	SessionNotification,
} from '@franklin/agent';

import { createSessionStore } from '../session-store.js';

function agentMessageChunk(text: string): SessionNotification {
	return {
		sessionId: 'test-session',
		update: {
			sessionUpdate: 'agent_message_chunk',
			content: { type: 'text', text },
		},
	} as SessionNotification;
}

describe('createSessionStore', () => {
	it('starts with an empty transcript', () => {
		const { store } = createSessionStore();
		expect(store.getSnapshot()).toEqual({ transcript: [] });
	});

	it('appends session updates to the transcript', async () => {
		const { store, handler } = createSessionStore();

		await handler.sessionUpdate(agentMessageChunk('hello'));

		expect(store.getSnapshot().transcript).toHaveLength(1);
		expect(store.getSnapshot().transcript[0]?.notification).toEqual(
			agentMessageChunk('hello'),
		);
	});

	it('notifies subscribers when the transcript changes', async () => {
		const { store, handler } = createSessionStore();
		const listener = vi.fn();
		store.subscribe(listener);

		await handler.sessionUpdate(agentMessageChunk('hello'));

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('returns the same snapshot reference when unchanged', () => {
		const { store } = createSessionStore();

		expect(store.getSnapshot()).toBe(store.getSnapshot());
	});

	it('auto-rejects permission requests by default', async () => {
		const { handler } = createSessionStore();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const response = await handler.requestPermission({
			sessionId: 'test-session',
			options: [
				{ optionId: 'allow', kind: 'allow_once', name: 'Allow' },
				{ optionId: 'reject', kind: 'reject_once', name: 'Reject' },
			],
			toolCall: { toolCallId: 'tool-1', title: 'Write file' },
		} satisfies RequestPermissionRequest);

		expect(response.outcome).toEqual({
			outcome: 'selected',
			optionId: 'reject',
		});
		expect(warn).toHaveBeenCalledTimes(1);
	});
});
