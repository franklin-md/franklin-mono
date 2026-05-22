import { describe, it, expect, vi } from 'vitest';
import { ContextTracker } from '../protocol/context-tracker.js';
import type { LLMConfig, ThinkingLevel } from '../types/context.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seededTracker(config: LLMConfig = {}): ContextTracker {
	const tracker = new ContextTracker();
	tracker.apply({
		systemPrompt: 'test',
		messages: [],
		tools: [],
		config,
	});
	return tracker;
}

// ---------------------------------------------------------------------------
// Basic apply
// ---------------------------------------------------------------------------

describe('ContextTracker.apply – field replacement', () => {
	it('replaces tools wholesale', () => {
		const tracker = seededTracker();
		tracker.apply({
			tools: [
				{
					name: 'read',
					description: 'Read a file',
					inputSchema: { type: 'object' },
				},
			],
		});
		expect(tracker.get().tools).toHaveLength(1);
		expect(tracker.get().tools[0]!.name).toBe('read');
	});

	it('clears tools when an empty array is provided', () => {
		const tracker = seededTracker();
		tracker.apply({
			tools: [
				{
					name: 'read',
					description: 'Read a file',
					inputSchema: { type: 'object' },
				},
			],
		});
		expect(tracker.get().tools).toHaveLength(1);

		tracker.apply({ tools: [] });
		expect(tracker.get().tools).toHaveLength(0);
	});

	it('does not touch fields not present in the partial', () => {
		const tracker = seededTracker({ provider: 'anthropic', apiKey: 'sk-123' });
		tracker.apply({
			systemPrompt: 'updated',
			messages: [],
		});
		expect(tracker.get().config.provider).toBe('anthropic');
		expect(tracker.get().config.apiKey).toBe('sk-123');
	});

	it('snapshots replacement arrays so later appends do not mutate the patch', () => {
		const tracker = seededTracker();
		const patch = {
			messages: [
				{
					role: 'user' as const,
					content: [{ type: 'text' as const, text: 'seed' }],
				},
			],
			tools: [
				{
					name: 'read',
					description: 'Read a file',
					inputSchema: { type: 'object' },
				},
			],
		};

		tracker.apply(patch);
		tracker.append({ role: 'user', content: [{ type: 'text', text: 'next' }] });

		expect(patch.messages).toHaveLength(1);
		expect(patch.tools).toHaveLength(1);
		expect(tracker.get().messages).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// Prompt field replacement
// ---------------------------------------------------------------------------

describe('ContextTracker.apply – prompt fields replace independently', () => {
	it('replaces both systemPrompt and messages when both are provided', () => {
		const tracker = seededTracker();
		tracker.append({
			role: 'user',
			content: [{ type: 'text', text: 'old' }],
		});

		tracker.apply({
			systemPrompt: 'new prompt',
			messages: [{ role: 'user', content: [{ type: 'text', text: 'new' }] }],
		});

		expect(tracker.get().systemPrompt).toBe('new prompt');
		expect(tracker.get().messages).toHaveLength(1);
		expect(tracker.get().messages[0]).toEqual({
			role: 'user',
			content: [{ type: 'text', text: 'new' }],
		});
	});

	it('updates systemPrompt without touching messages', () => {
		const tracker = seededTracker();
		tracker.append({
			role: 'user',
			content: [{ type: 'text', text: 'preserved' }],
		});

		tracker.apply({ systemPrompt: 'updated prompt' });

		expect(tracker.get().systemPrompt).toBe('updated prompt');
		expect(tracker.get().messages).toHaveLength(1);
		expect(tracker.get().messages[0]).toEqual({
			role: 'user',
			content: [{ type: 'text', text: 'preserved' }],
		});
	});

	it('replaces messages without touching systemPrompt', () => {
		const tracker = seededTracker();
		const replacement = [
			{
				role: 'user' as const,
				content: [{ type: 'text' as const, text: 'a' }],
			},
			{
				role: 'user' as const,
				content: [{ type: 'text' as const, text: 'b' }],
			},
		];

		tracker.apply({ messages: replacement });

		expect(tracker.get().systemPrompt).toBe('test');
		expect(tracker.get().messages).toHaveLength(2);
	});

	it('replaces messages with an empty array when explicitly provided', () => {
		const tracker = seededTracker();
		tracker.append({
			role: 'user',
			content: [{ type: 'text', text: 'will be cleared' }],
		});

		tracker.apply({ messages: [] });

		expect(tracker.get().messages).toHaveLength(0);
		expect(tracker.get().systemPrompt).toBe('test');
	});

	it('leaves prompt fields untouched when both are omitted', () => {
		const tracker = seededTracker();
		tracker.append({
			role: 'user',
			content: [{ type: 'text', text: 'keep' }],
		});

		tracker.apply({ config: { reasoning: 'high' } });

		expect(tracker.get().systemPrompt).toBe('test');
		expect(tracker.get().messages).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Config merge (the bug fix)
// ---------------------------------------------------------------------------

describe('ContextTracker.apply – config is shallow-merged', () => {
	it('preserves apiKey when only reasoning is updated', () => {
		const tracker = seededTracker({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
			apiKey: 'sk-secret',
			reasoning: 'high',
		});

		tracker.apply({ config: { reasoning: 'high' } });

		const config = tracker.get().config;
		expect(config.reasoning).toBe('high');
		expect(config.apiKey).toBe('sk-secret');
		expect(config.provider).toBe('anthropic');
		expect(config.model).toBe('claude-sonnet-4-5');
	});

	it('preserves apiKey when only model is updated', () => {
		const tracker = seededTracker({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
			apiKey: 'sk-secret',
		});

		tracker.apply({ config: { model: 'claude-opus-4' } });

		expect(tracker.get().config.model).toBe('claude-opus-4');
		expect(tracker.get().config.apiKey).toBe('sk-secret');
	});

	it('preserves reasoning when only apiKey is updated', () => {
		const tracker = seededTracker({
			reasoning: 'high',
			provider: 'anthropic',
		});

		tracker.apply({ config: { apiKey: 'sk-new' } });

		expect(tracker.get().config.apiKey).toBe('sk-new');
		expect(tracker.get().config.reasoning).toBe('high');
		expect(tracker.get().config.provider).toBe('anthropic');
	});

	it('overwrites a field when explicitly set to a new value', () => {
		const tracker = seededTracker({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
			apiKey: 'sk-old',
		});

		tracker.apply({
			config: {
				provider: 'openai',
				model: 'gpt-4o',
				apiKey: 'sk-new',
			},
		});

		const config = tracker.get().config;
		expect(config.provider).toBe('openai');
		expect(config.model).toBe('gpt-4o');
		expect(config.apiKey).toBe('sk-new');
	});

	it('allows setting a field to undefined (explicit clear)', () => {
		const tracker = seededTracker({
			provider: 'anthropic',
			apiKey: 'sk-secret',
			reasoning: 'high',
		});

		tracker.apply({ config: { reasoning: undefined } });

		expect(tracker.get().config.reasoning).toBeUndefined();
		expect(tracker.get().config.apiKey).toBe('sk-secret');
		expect(tracker.get().config.provider).toBe('anthropic');
	});

	it('starts with an empty config and merges patches into it', () => {
		const tracker = new ContextTracker();
		expect(tracker.get().config).toEqual({});

		tracker.apply({ config: { reasoning: 'low' } });

		expect(tracker.get().config.reasoning).toBe('low');
	});

	it('survives multiple sequential partial updates', () => {
		const tracker = seededTracker({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
			apiKey: 'sk-secret',
			reasoning: 'high',
		});

		// Step 1: Auth refreshes the key
		tracker.apply({ config: { apiKey: 'sk-refreshed' } });

		// Step 2: User changes thinking level
		tracker.apply({ config: { reasoning: 'xhigh' } });

		// Step 3: User changes model
		tracker.apply({ config: { model: 'claude-opus-4' } });

		const config = tracker.get().config;
		expect(config).toEqual({
			provider: 'anthropic',
			model: 'claude-opus-4',
			apiKey: 'sk-refreshed',
			reasoning: 'xhigh',
		});
	});

	it('simulates the exact setLLMConfig flow that caused the bug', () => {
		const tracker = seededTracker({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
			apiKey: 'sk-secret',
			reasoning: 'high',
		});

		// This is what setLLMConfig does: reads snapshot (no apiKey), spreads update
		const current = tracker.get().config;
		const snapshot = {
			provider: current.provider,
			model: current.model,
			reasoning: current.reasoning,
			// apiKey deliberately omitted — this is what snapshotLLMConfig does
		};

		tracker.apply({
			config: { ...snapshot, reasoning: 'high' as ThinkingLevel },
		});

		// The apiKey must survive
		expect(tracker.get().config.apiKey).toBe('sk-secret');
		expect(tracker.get().config.reasoning).toBe('high');
	});
});

// ---------------------------------------------------------------------------
// append
// ---------------------------------------------------------------------------

describe('ContextTracker.append', () => {
	it('appends a message to messages', () => {
		const tracker = seededTracker();
		tracker.append({ role: 'user', content: [{ type: 'text', text: 'hi' }] });
		expect(tracker.get().messages).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// onChange
// ---------------------------------------------------------------------------

describe('ContextTracker.onChange', () => {
	it('fires on apply', () => {
		const tracker = seededTracker();
		const spy = vi.fn();
		tracker.onChange = spy;

		tracker.apply({ config: { reasoning: 'high' } });
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('fires on append', () => {
		const tracker = seededTracker();
		const spy = vi.fn();
		tracker.onChange = spy;

		tracker.append({ role: 'user', content: [{ type: 'text', text: 'hi' }] });
		expect(spy).toHaveBeenCalledTimes(1);
	});
});
