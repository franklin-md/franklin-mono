import { describe, expect, it } from 'vitest';

import { mapNotification, mapServerRequest } from '../event-mapper.js';

// ---------------------------------------------------------------------------
// mapNotification
// ---------------------------------------------------------------------------

describe('mapNotification', () => {
	it('maps thread/started → [] (lifecycle removed)', () => {
		const events = mapNotification('thread/started', {
			thread: { id: 't1' },
		});
		expect(events).toEqual([]);
	});

	it('maps turn/started → [] (lifecycle removed)', () => {
		const events = mapNotification('turn/started', {
			turn: { id: 'turn1' },
		});
		expect(events).toEqual([]);
	});

	it('maps turn/completed → turn.completed', () => {
		const events = mapNotification('turn/completed', {
			turn: { id: 'turn1' },
		});
		expect(events).toEqual([{ type: 'turn.completed' }]);
	});

	it('maps item/started with userMessage → item.started user_message', () => {
		const events = mapNotification('item/started', {
			item: { type: 'userMessage', id: 'i1', text: 'hello' },
		});
		expect(events).toEqual([
			{ type: 'item.started', item: { kind: 'user_message', text: 'hello' } },
		]);
	});

	it('maps item/started with userMessage content fallback', () => {
		const events = mapNotification('item/started', {
			item: {
				type: 'userMessage',
				id: 'i1',
				content: [{ type: 'text', text: 'hello', text_elements: [] }],
			},
		});
		expect(events).toEqual([
			{ type: 'item.started', item: { kind: 'user_message', text: 'hello' } },
		]);
	});

	it('maps item/started with agentMessage → item.started assistant_message', () => {
		const events = mapNotification('item/started', {
			item: { type: 'agentMessage', id: 'i2', text: '' },
		});
		expect(events).toEqual([
			{ type: 'item.started', item: { kind: 'assistant_message' } },
		]);
	});

	it('returns [] for item/started with unknown item type', () => {
		const events = mapNotification('item/started', {
			item: { type: 'toolCall', id: 'i3' },
		});
		expect(events).toEqual([]);
	});

	it('maps item/completed with userMessage', () => {
		const events = mapNotification('item/completed', {
			item: { type: 'userMessage', id: 'i1', text: 'hello' },
		});
		expect(events).toEqual([
			{
				type: 'item.completed',
				item: { kind: 'user_message', text: 'hello' },
			},
		]);
	});

	it('maps item/completed with agentMessage', () => {
		const events = mapNotification('item/completed', {
			item: { type: 'agentMessage', id: 'i2', text: 'response' },
		});
		expect(events).toEqual([
			{
				type: 'item.completed',
				item: { kind: 'assistant_message', text: 'response' },
			},
		]);
	});

	it('returns [] for item/completed with unknown item type', () => {
		const events = mapNotification('item/completed', {
			item: { type: 'toolCall', id: 'i3' },
		});
		expect(events).toEqual([]);
	});

	it('maps item/agentMessage/delta → item.delta assistant_message', () => {
		const events = mapNotification('item/agentMessage/delta', {
			item: { id: 'i2' },
			delta: { text: 'chunk' },
		});
		expect(events).toEqual([
			{
				type: 'item.delta',
				item: { kind: 'assistant_message', textDelta: 'chunk' },
			},
		]);
	});

	it('maps error → error event', () => {
		const events = mapNotification('error', {
			error: { code: 'E_FAIL', message: 'Something broke' },
		});
		expect(events).toEqual([
			{
				type: 'error',
				error: { code: 'E_FAIL', message: 'Something broke' },
			},
		]);
	});

	it('maps error without code to CODEX_ERROR', () => {
		const events = mapNotification('error', {
			error: { message: 'Something broke' },
		});
		expect(events).toEqual([
			{
				type: 'error',
				error: { code: 'CODEX_ERROR', message: 'Something broke' },
			},
		]);
	});

	it('maps thread/closed → agent.exited', () => {
		const events = mapNotification('thread/closed', {
			thread: { id: 't1' },
		});
		expect(events).toEqual([{ type: 'agent.exited' }]);
	});

	// -- Reasoning events -------------------------------------------------------

	it('maps item/started with reasoning → item.started reasoning', () => {
		const events = mapNotification('item/started', {
			item: { type: 'reasoning', id: 'r1' },
		});
		expect(events).toEqual([
			{ type: 'item.started', item: { kind: 'reasoning' } },
		]);
	});

	it('maps item/completed with reasoning → item.completed reasoning', () => {
		const events = mapNotification('item/completed', {
			item: {
				type: 'reasoning',
				id: 'r1',
				content: ['thinking ', 'hard'],
			},
		});
		expect(events).toEqual([
			{
				type: 'item.completed',
				item: { kind: 'reasoning', text: 'thinking hard' },
			},
		]);
	});

	it('maps item/completed with reasoning and no content → empty text', () => {
		const events = mapNotification('item/completed', {
			item: { type: 'reasoning', id: 'r1' },
		});
		expect(events).toEqual([
			{
				type: 'item.completed',
				item: { kind: 'reasoning', text: '' },
			},
		]);
	});

	it('maps item/reasoning/textDelta → item.delta reasoning', () => {
		const events = mapNotification('item/reasoning/textDelta', {
			delta: 'thinking...',
			contentIndex: 0,
			itemId: 'r1',
			threadId: 't1',
			turnId: 'turn1',
		});
		expect(events).toEqual([
			{
				type: 'item.delta',
				item: { kind: 'reasoning', textDelta: 'thinking...' },
			},
		]);
	});

	it('maps item/reasoning/summaryTextDelta → item.delta reasoning', () => {
		const events = mapNotification('item/reasoning/summaryTextDelta', {
			delta: 'summary chunk',
			summaryIndex: 0,
			itemId: 'r1',
			threadId: 't1',
			turnId: 'turn1',
		});
		expect(events).toEqual([
			{
				type: 'item.delta',
				item: { kind: 'reasoning', textDelta: 'summary chunk' },
			},
		]);
	});

	it('maps item/reasoning/summaryPartAdded → [] (no-op)', () => {
		const events = mapNotification('item/reasoning/summaryPartAdded', {
			itemId: 'r1',
			threadId: 't1',
			turnId: 'turn1',
		});
		expect(events).toEqual([]);
	});

	// -- Undefined delta guard --------------------------------------------------

	it('guards against undefined delta.text in agentMessage/delta', () => {
		const events = mapNotification('item/agentMessage/delta', {
			item: { id: 'i2' },
			delta: {},
		});
		expect(events).toEqual([
			{
				type: 'item.delta',
				item: { kind: 'assistant_message', textDelta: '' },
			},
		]);
	});

	it('returns [] for unknown notification methods', () => {
		expect(mapNotification('unknown/method', {})).toEqual([]);
		expect(mapNotification('thread/status/changed', {})).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// mapServerRequest
// ---------------------------------------------------------------------------

describe('mapServerRequest', () => {
	it('maps command/approve → permission.requested', () => {
		const result = mapServerRequest('command/approve', 42, {
			item: { id: 'i1' },
			command: { command: 'rm -rf /' },
		});
		expect(result).not.toBeNull();
		expect(result!.event).toEqual({
			type: 'permission.requested',
			payload: { kind: 'generic', message: 'Approve command: rm -rf /' },
		});
		expect(result!.pendingApproval).toEqual({
			codexRequestId: 42,
			codexMethod: 'command/approve',
		});
	});

	it('maps file/approve → permission.requested', () => {
		const result = mapServerRequest('file/approve', 7, {
			item: { id: 'i2' },
			file: { path: '/tmp/test.txt' },
		});
		expect(result).not.toBeNull();
		expect(result!.event).toEqual({
			type: 'permission.requested',
			payload: {
				kind: 'generic',
				message: 'Approve file change: /tmp/test.txt',
			},
		});
		expect(result!.pendingApproval).toEqual({
			codexRequestId: 7,
			codexMethod: 'file/approve',
		});
	});

	it('maps permissions/approve → permission.requested', () => {
		const result = mapServerRequest('permissions/approve', 99, {
			item: { id: 'i3' },
			permissions: ['read', 'write'],
		});
		expect(result).not.toBeNull();
		expect(result!.event).toEqual({
			type: 'permission.requested',
			payload: {
				kind: 'generic',
				message: 'Approve permissions: read, write',
			},
		});
	});

	it('returns null for unknown server-request methods', () => {
		expect(mapServerRequest('unknown/method', 1, {})).toBeNull();
	});
});
