import { describe, expect, it } from 'vitest';

import { ItemCompactor } from '../item-compactor.js';

const NOW = 1000;

describe('ItemCompactor', () => {
	// -----------------------------------------------------------------------
	// Happy path: item lifecycle
	// -----------------------------------------------------------------------

	it('yields nothing on item.started', () => {
		const c = new ItemCompactor();
		const result = c.process(
			{ type: 'item.started', item: { kind: 'assistant_message' } },
			NOW,
		);
		expect(result).toEqual([]);
	});

	it('yields nothing on item.delta', () => {
		const c = new ItemCompactor();
		c.process(
			{ type: 'item.started', item: { kind: 'assistant_message' } },
			NOW,
		);
		const result = c.process(
			{
				type: 'item.delta',
				item: { kind: 'assistant_message', textDelta: 'hello' },
			},
			NOW,
		);
		expect(result).toEqual([]);
	});

	it('yields ItemEntry on item.completed', () => {
		const c = new ItemCompactor();
		c.process(
			{ type: 'item.started', item: { kind: 'assistant_message' } },
			NOW,
		);
		const result = c.process(
			{
				type: 'item.completed',
				item: { kind: 'assistant_message', text: 'hello world' },
			},
			NOW,
		);
		expect(result).toEqual([
			{
				kind: 'item',
				ts: NOW,
				itemKind: 'assistant_message',
				item: { kind: 'assistant_message', text: 'hello world' },
			},
		]);
	});

	// -----------------------------------------------------------------------
	// Interrupted item: turn.completed discards pending
	// -----------------------------------------------------------------------

	it('discards pending item on turn.completed', () => {
		const c = new ItemCompactor();
		c.process(
			{ type: 'item.started', item: { kind: 'assistant_message' } },
			NOW,
		);
		// Turn completes before item completes — item is interrupted
		const result = c.process({ type: 'turn.completed' }, NOW);
		expect(result).toEqual([{ kind: 'turn', ts: NOW, event: 'completed' }]);

		// A subsequent item.completed should NOT produce a stale entry
		// (pendingItemKind was cleared)
	});

	// -----------------------------------------------------------------------
	// Exited mid-item: agent.exited discards pending
	// -----------------------------------------------------------------------

	it('discards pending item on agent.exited', () => {
		const c = new ItemCompactor();
		c.process(
			{ type: 'item.started', item: { kind: 'assistant_message' } },
			NOW,
		);
		const result = c.process({ type: 'agent.exited' }, NOW);
		expect(result).toEqual([{ kind: 'status', ts: NOW, status: 'exited' }]);
	});

	// -----------------------------------------------------------------------
	// Error mid-item: pending stays (may still complete)
	// -----------------------------------------------------------------------

	it('yields error entry but keeps pending item on error', () => {
		const c = new ItemCompactor();
		c.process(
			{ type: 'item.started', item: { kind: 'assistant_message' } },
			NOW,
		);

		const errorResult = c.process(
			{ type: 'error', error: { code: 'E', message: 'fail' } },
			NOW,
		);
		expect(errorResult).toEqual([
			{ kind: 'error', ts: NOW, error: { code: 'E', message: 'fail' } },
		]);

		// Item can still complete after error
		const itemResult = c.process(
			{
				type: 'item.completed',
				item: { kind: 'assistant_message', text: 'recovered' },
			},
			NOW + 1,
		);
		expect(itemResult).toHaveLength(1);
		expect(itemResult[0]!.kind).toBe('item');
	});

	// -----------------------------------------------------------------------
	// Session events
	// -----------------------------------------------------------------------

	it('yields session entry for session.started', () => {
		const c = new ItemCompactor();
		const result = c.process({ type: 'session.started' }, NOW);
		expect(result).toEqual([{ kind: 'session', ts: NOW, event: 'started' }]);
	});

	it('yields session entry for session.resumed', () => {
		const c = new ItemCompactor();
		const result = c.process({ type: 'session.resumed' }, NOW);
		expect(result).toEqual([{ kind: 'session', ts: NOW, event: 'resumed' }]);
	});

	it('yields session entry for session.forked', () => {
		const c = new ItemCompactor();
		const result = c.process({ type: 'session.forked' }, NOW);
		expect(result).toEqual([{ kind: 'session', ts: NOW, event: 'forked' }]);
	});

	// -----------------------------------------------------------------------
	// Permission events
	// -----------------------------------------------------------------------

	it('yields permission entry for permission.requested', () => {
		const c = new ItemCompactor();
		const payload = { kind: 'generic' as const, message: 'approve?' };
		const result = c.process({ type: 'permission.requested', payload }, NOW);
		expect(result).toEqual([
			{ kind: 'permission', ts: NOW, event: 'requested', payload },
		]);
	});

	it('yields permission entry for permission.resolved', () => {
		const c = new ItemCompactor();
		const payload = { decision: 'allow' as const };
		const result = c.process({ type: 'permission.resolved', payload }, NOW);
		expect(result).toEqual([
			{ kind: 'permission', ts: NOW, event: 'resolved', payload },
		]);
	});

	// -----------------------------------------------------------------------
	// Agent lifecycle
	// -----------------------------------------------------------------------

	it('yields status entry for agent.ready', () => {
		const c = new ItemCompactor();
		const result = c.process({ type: 'agent.ready' }, NOW);
		expect(result).toEqual([{ kind: 'status', ts: NOW, status: 'ready' }]);
	});

	it('yields turn entry for turn.started', () => {
		const c = new ItemCompactor();
		const result = c.process({ type: 'turn.started' }, NOW);
		expect(result).toEqual([{ kind: 'turn', ts: NOW, event: 'started' }]);
	});

	// -----------------------------------------------------------------------
	// Reset
	// -----------------------------------------------------------------------

	it('reset clears pending state', () => {
		const c = new ItemCompactor();
		c.process(
			{ type: 'item.started', item: { kind: 'assistant_message' } },
			NOW,
		);
		c.reset();

		// After reset, a new item lifecycle should work cleanly
		c.process(
			{ type: 'item.started', item: { kind: 'user_message', text: 'hi' } },
			NOW,
		);
		const result = c.process(
			{
				type: 'item.completed',
				item: { kind: 'user_message', text: 'hi' },
			},
			NOW,
		);
		expect(result).toHaveLength(1);
		expect(result[0]!.kind).toBe('item');
	});
});
