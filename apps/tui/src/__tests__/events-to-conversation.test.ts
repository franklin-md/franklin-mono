import { describe, expect, it } from 'vitest';

import type { ManagedAgentEvent } from '@franklin/managed-agent';

import { eventsToConversation } from '../lib/events-to-conversation.js';

describe('eventsToConversation', () => {
	it('returns empty array for no events', () => {
		expect(eventsToConversation([])).toEqual([]);
	});

	it('skips non-item events', () => {
		const events: ManagedAgentEvent[] = [
			{ type: 'agent.ready' },
			{ type: 'session.started' },
			{ type: 'turn.started' },
			{ type: 'turn.completed' },
		];
		expect(eventsToConversation(events)).toEqual([]);
	});

	it('folds started/delta/completed into a single completed item', () => {
		const events: ManagedAgentEvent[] = [
			{ type: 'item.started', item: { kind: 'assistant_message' } },
			{
				type: 'item.delta',
				item: { kind: 'assistant_message', textDelta: 'hello' },
			},
			{
				type: 'item.delta',
				item: { kind: 'assistant_message', textDelta: ' world' },
			},
			{
				type: 'item.completed',
				item: { kind: 'assistant_message', text: 'hello world' },
			},
		];
		expect(eventsToConversation(events)).toEqual([
			{
				kind: 'assistant_message',
				text: 'hello world',
				streaming: false,
			},
		]);
	});

	it('marks incomplete item as streaming', () => {
		const events: ManagedAgentEvent[] = [
			{ type: 'item.started', item: { kind: 'assistant_message' } },
			{
				type: 'item.delta',
				item: { kind: 'assistant_message', textDelta: 'partial' },
			},
		];
		expect(eventsToConversation(events)).toEqual([
			{
				kind: 'assistant_message',
				text: 'partial',
				streaming: true,
			},
		]);
	});

	it('handles user_message items with initial text', () => {
		const events: ManagedAgentEvent[] = [
			{
				type: 'item.started',
				item: { kind: 'user_message', text: 'hi there' },
			},
			{
				type: 'item.completed',
				item: { kind: 'user_message', text: 'hi there' },
			},
		];
		expect(eventsToConversation(events)).toEqual([
			{
				kind: 'user_message',
				text: 'hi there',
				streaming: false,
			},
		]);
	});

	it('handles multiple items in sequence', () => {
		const events: ManagedAgentEvent[] = [
			{
				type: 'item.started',
				item: { kind: 'user_message', text: 'question' },
			},
			{
				type: 'item.completed',
				item: { kind: 'user_message', text: 'question' },
			},
			{ type: 'turn.started' },
			{ type: 'item.started', item: { kind: 'assistant_message' } },
			{
				type: 'item.delta',
				item: { kind: 'assistant_message', textDelta: 'answer' },
			},
			{
				type: 'item.completed',
				item: { kind: 'assistant_message', text: 'answer' },
			},
			{ type: 'turn.completed' },
		];

		const result = eventsToConversation(events);
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			kind: 'user_message',
			text: 'question',
			streaming: false,
		});
		expect(result[1]).toEqual({
			kind: 'assistant_message',
			text: 'answer',
			streaming: false,
		});
	});

	it('uses completed text over accumulated deltas', () => {
		const events: ManagedAgentEvent[] = [
			{ type: 'item.started', item: { kind: 'assistant_message' } },
			{
				type: 'item.delta',
				item: { kind: 'assistant_message', textDelta: 'wrong' },
			},
			{
				type: 'item.completed',
				item: { kind: 'assistant_message', text: 'correct final text' },
			},
		];
		expect(eventsToConversation(events)).toEqual([
			{
				kind: 'assistant_message',
				text: 'correct final text',
				streaming: false,
			},
		]);
	});

	it('handles started with no deltas before completed', () => {
		const events: ManagedAgentEvent[] = [
			{ type: 'item.started', item: { kind: 'assistant_message' } },
			{
				type: 'item.completed',
				item: { kind: 'assistant_message', text: 'instant' },
			},
		];
		expect(eventsToConversation(events)).toEqual([
			{
				kind: 'assistant_message',
				text: 'instant',
				streaming: false,
			},
		]);
	});

	it('handles item.started with no further events', () => {
		const events: ManagedAgentEvent[] = [
			{ type: 'item.started', item: { kind: 'assistant_message' } },
		];
		expect(eventsToConversation(events)).toEqual([
			{
				kind: 'assistant_message',
				text: '',
				streaming: true,
			},
		]);
	});
});
