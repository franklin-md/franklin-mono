import { describe, expect, it } from 'vitest';

import type { PromptRequest, PromptResponse } from '@agentclientprotocol/sdk';

import type { Middleware } from '../stack/index.js';
import { sequence } from '../stack/index.js';

describe('sequence', () => {
	it('returns an empty middleware for an empty array', () => {
		const mw = sequence([]);
		// No methods defined — it's a passthrough
		expect(Object.keys(mw)).toHaveLength(0);
	});

	it('returns the single middleware unchanged for a one-element array', () => {
		const single: Middleware = {
			prompt: async (params, next) => next(params),
		};
		const mw = sequence([single]);
		expect(mw.prompt).toBeDefined();
	});

	it('chains outbound methods in order (first is outermost)', async () => {
		const log: string[] = [];

		const a: Middleware = {
			prompt: async (params, next) => {
				log.push('a-before');
				const r = await next(params);
				log.push('a-after');
				return r;
			},
		};

		const b: Middleware = {
			prompt: async (params, next) => {
				log.push('b-before');
				const r = await next(params);
				log.push('b-after');
				return r;
			},
		};

		const combined = sequence([a, b]);

		// Call the combined middleware with a terminal
		const terminal = async (_p: PromptRequest): Promise<PromptResponse> => {
			log.push('terminal');
			return { stopReason: 'end_turn' };
		};

		await combined.prompt!(
			{
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'hello' }],
			},
			terminal,
		);

		expect(log).toEqual([
			'a-before',
			'b-before',
			'terminal',
			'b-after',
			'a-after',
		]);
	});

	it('only includes methods that at least one middleware defines', () => {
		const promptOnly: Middleware = {
			prompt: async (params, next) => next(params),
		};

		const initOnly: Middleware = {
			initialize: async (params, next) => next(params),
		};

		const combined = sequence([promptOnly, initOnly]);
		expect(combined.prompt).toBeDefined();
		expect(combined.initialize).toBeDefined();
		// Methods nobody defined should be absent
		expect(combined.cancel).toBeUndefined();
		expect(combined.sessionUpdate).toBeUndefined();
	});

	it('skips middlewares that do not define a method in the chain', async () => {
		const log: string[] = [];

		const a: Middleware = {
			prompt: async (params, next) => {
				log.push('a');
				return next(params);
			},
		};

		const noPrompt: Middleware = {
			// Only defines initialize, not prompt
			initialize: async (params, next) => next(params),
		};

		const c: Middleware = {
			prompt: async (params, next) => {
				log.push('c');
				return next(params);
			},
		};

		const combined = sequence([a, noPrompt, c]);

		const terminal = async (_p: PromptRequest): Promise<PromptResponse> => {
			log.push('terminal');
			return { stopReason: 'end_turn' };
		};

		await combined.prompt!(
			{
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'hello' }],
			},
			terminal,
		);

		// noPrompt has no prompt method, so it's skipped in the prompt chain
		expect(log).toEqual(['a', 'c', 'terminal']);
	});

	it('supports nesting — sequence of sequences', async () => {
		const log: string[] = [];

		const mw = (name: string): Middleware => ({
			prompt: async (params, next) => {
				log.push(name);
				return next(params);
			},
		});

		const inner = sequence([mw('b'), mw('c')]);
		const outer = sequence([mw('a'), inner, mw('d')]);

		const terminal = async (_p: PromptRequest): Promise<PromptResponse> => {
			log.push('terminal');
			return { stopReason: 'end_turn' };
		};

		await outer.prompt!(
			{
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'hello' }],
			},
			terminal,
		);

		expect(log).toEqual(['a', 'b', 'c', 'd', 'terminal']);
	});

	it('handles dispose in the chain', async () => {
		const log: string[] = [];

		const a: Middleware = {
			dispose: async (_params, next) => {
				log.push('a-dispose');
				return next(_params);
			},
		};

		const b: Middleware = {
			dispose: async (_params, next) => {
				log.push('b-dispose');
				return next(_params);
			},
		};

		const combined = sequence([a, b]);

		// Dispose terminal
		const terminal = async () => {
			log.push('terminal-dispose');
		};

		await combined.dispose!(undefined as never, terminal);

		expect(log).toEqual(['a-dispose', 'b-dispose', 'terminal-dispose']);
	});
});
