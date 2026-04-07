import { describe, it, expect, vi } from 'vitest';
import { CtxTracker } from '../protocol/ctx-tracker.js';
import type { LLMConfig, ThinkingLevel } from '../types/context.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seededTracker(config: LLMConfig = {}): CtxTracker {
	const tracker = new CtxTracker();
	tracker.apply({
		history: { systemPrompt: 'test', messages: [] },
		tools: [],
		config,
	});
	return tracker;
}

// ---------------------------------------------------------------------------
// Basic apply
// ---------------------------------------------------------------------------

describe('CtxTracker.apply – field replacement', () => {
	it('replaces history wholesale', () => {
		const tracker = seededTracker();
		tracker.apply({
			history: { systemPrompt: 'new prompt', messages: [] },
		});
		expect(tracker.get().history.systemPrompt).toBe('new prompt');
	});

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

	it('does not touch fields not present in the partial', () => {
		const tracker = seededTracker({ provider: 'anthropic', apiKey: 'sk-123' });
		tracker.apply({
			history: { systemPrompt: 'updated', messages: [] },
		});
		expect(tracker.get().config?.provider).toBe('anthropic');
		expect(tracker.get().config?.apiKey).toBe('sk-123');
	});
});

// ---------------------------------------------------------------------------
// Config merge (the bug fix)
// ---------------------------------------------------------------------------

describe('CtxTracker.apply – config is shallow-merged', () => {
	it('preserves apiKey when only reasoning is updated', () => {
		const tracker = seededTracker({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
			apiKey: 'sk-secret',
			reasoning: 'medium',
		});

		tracker.apply({ config: { reasoning: 'high' } });

		const config = tracker.get().config;
		expect(config?.reasoning).toBe('high');
		expect(config?.apiKey).toBe('sk-secret');
		expect(config?.provider).toBe('anthropic');
		expect(config?.model).toBe('claude-sonnet-4-5');
	});

	it('preserves apiKey when only model is updated', () => {
		const tracker = seededTracker({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
			apiKey: 'sk-secret',
		});

		tracker.apply({ config: { model: 'claude-opus-4' } });

		expect(tracker.get().config?.model).toBe('claude-opus-4');
		expect(tracker.get().config?.apiKey).toBe('sk-secret');
	});

	it('preserves reasoning when only apiKey is updated', () => {
		const tracker = seededTracker({
			reasoning: 'high',
			provider: 'anthropic',
		});

		tracker.apply({ config: { apiKey: 'sk-new' } });

		expect(tracker.get().config?.apiKey).toBe('sk-new');
		expect(tracker.get().config?.reasoning).toBe('high');
		expect(tracker.get().config?.provider).toBe('anthropic');
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
		expect(config?.provider).toBe('openai');
		expect(config?.model).toBe('gpt-4o');
		expect(config?.apiKey).toBe('sk-new');
	});

	it('allows setting a field to undefined (explicit clear)', () => {
		const tracker = seededTracker({
			provider: 'anthropic',
			apiKey: 'sk-secret',
			reasoning: 'high',
		});

		tracker.apply({ config: { reasoning: undefined } });

		expect(tracker.get().config?.reasoning).toBeUndefined();
		expect(tracker.get().config?.apiKey).toBe('sk-secret');
		expect(tracker.get().config?.provider).toBe('anthropic');
	});

	it('merges into an initially undefined config', () => {
		const tracker = new CtxTracker();
		// Initial state has no config
		expect(tracker.get().config).toBeUndefined();

		tracker.apply({ config: { reasoning: 'low' } });

		expect(tracker.get().config?.reasoning).toBe('low');
	});

	it('survives multiple sequential partial updates', () => {
		const tracker = seededTracker({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
			apiKey: 'sk-secret',
			reasoning: 'medium',
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
			reasoning: 'medium',
		});

		// This is what setLLMConfig does: reads snapshot (no apiKey), spreads update
		const snapshot = {
			provider: tracker.get().config?.provider,
			model: tracker.get().config?.model,
			reasoning: tracker.get().config?.reasoning,
			// apiKey deliberately omitted — this is what snapshotLLMConfig does
		};

		tracker.apply({
			config: { ...snapshot, reasoning: 'high' as ThinkingLevel },
		});

		// The apiKey must survive
		expect(tracker.get().config?.apiKey).toBe('sk-secret');
		expect(tracker.get().config?.reasoning).toBe('high');
	});
});

// ---------------------------------------------------------------------------
// append
// ---------------------------------------------------------------------------

describe('CtxTracker.append', () => {
	it('appends a message to history', () => {
		const tracker = seededTracker();
		tracker.append({ role: 'user', content: [{ type: 'text', text: 'hi' }] });
		expect(tracker.get().history.messages).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// onChange
// ---------------------------------------------------------------------------

describe('CtxTracker.onChange', () => {
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
