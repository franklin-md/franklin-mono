import { describe, expect, it, vi } from 'vitest';

import type { PromptRequest } from '@agentclientprotocol/sdk';

import type { AgentStack, Middleware } from '../stack/index.js';
import { compose } from '../stack/index.js';

describe('compose (pure)', () => {
	it('wraps middleware around inner — middleware calls next', async () => {
		const log: string[] = [];

		const inner: Partial<AgentStack> = {
			prompt: async (_p) => {
				log.push('inner');
				return { stopReason: 'end_turn' as const };
			},
		};

		const mw: Middleware = {
			prompt: async (params, next) => {
				log.push('mw-before');
				const result = await next(params);
				log.push('mw-after');
				return result;
			},
		};

		const composed = compose(mw, inner);
		expect(composed.prompt).toBeDefined();

		await composed.prompt!({
			sessionId: 'test',
			prompt: [{ type: 'text', text: 'hello' }],
		});

		expect(log).toEqual(['mw-before', 'inner', 'mw-after']);
	});

	it('passes through methods not in middleware', async () => {
		const inner: Partial<AgentStack> = {
			prompt: async () => ({ stopReason: 'end_turn' as const }),
			cancel: async () => {},
		};

		const mw: Middleware = {
			prompt: async (params, next) => next(params),
		};

		const composed = compose(mw, inner);
		expect(composed.prompt).toBeDefined();
		expect(composed.cancel).toBeDefined();
		// Methods not in inner or middleware are absent
		expect(composed.initialize).toBeUndefined();
	});

	it('middleware can modify params before forwarding', async () => {
		const captured: PromptRequest[] = [];

		const inner: Partial<AgentStack> = {
			prompt: async (p) => {
				captured.push(p);
				return { stopReason: 'end_turn' as const };
			},
		};

		const addPrefix: Middleware = {
			prompt: async (params, next) => {
				const modified: PromptRequest = {
					...params,
					prompt: [
						{
							type: 'text',
							text: '[PREFIX] ' + (params.prompt[0] as { text: string }).text,
						},
					],
				};
				return next(modified);
			},
		};

		const composed = compose(addPrefix, inner);
		await composed.prompt!({
			sessionId: 'test',
			prompt: [{ type: 'text', text: 'hello' }],
		});

		expect(captured).toHaveLength(1);
		expect((captured[0]!.prompt[0] as { text: string }).text).toBe(
			'[PREFIX] hello',
		);
	});

	it('middleware can short-circuit without calling next', async () => {
		const innerFn = vi.fn();

		const inner: Partial<AgentStack> = {
			prompt: async () => {
				innerFn();
				return { stopReason: 'end_turn' as const };
			},
		};

		const shortCircuit: Middleware = {
			prompt: async (_params, _next) => {
				return { stopReason: 'end_turn' as const };
			},
		};

		const composed = compose(shortCircuit, inner);
		const result = await composed.prompt!({
			sessionId: 'test',
			prompt: [{ type: 'text', text: 'hello' }],
		});

		expect(result.stopReason).toBe('end_turn');
		expect(innerFn).not.toHaveBeenCalled();
	});

	it('throws methodNotFound when middleware calls next but inner has no method', async () => {
		const inner: Partial<AgentStack> = {};

		const mw: Middleware = {
			prompt: async (params, next) => next(params),
		};

		const composed = compose(mw, inner);

		await expect(
			composed.prompt!({
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'hello' }],
			}),
		).rejects.toThrow();
	});

	it('composes event methods the same as command methods', async () => {
		const log: string[] = [];

		const inner: Partial<AgentStack> = {
			sessionUpdate: async () => {
				log.push('handler');
			},
		};

		const mw: Middleware = {
			sessionUpdate: async (params, next) => {
				log.push('mw');
				return next(params);
			},
		};

		const composed = compose(mw, inner);
		await composed.sessionUpdate!({
			sessionId: 'test',
			update: {
				sessionUpdate: 'agent_message_chunk',
				content: { type: 'text', text: 'hi' },
			},
		} as never);

		expect(log).toEqual(['mw', 'handler']);
	});

	it('composes dispose', async () => {
		const log: string[] = [];

		const inner: Partial<AgentStack> = {
			dispose: async () => {
				log.push('inner-dispose');
			},
		};

		const mw: Middleware = {
			dispose: async (_params, next) => {
				log.push('mw-dispose');
				return next(_params);
			},
		};

		const composed = compose(mw, inner);
		await composed.dispose!();

		expect(log).toEqual(['mw-dispose', 'inner-dispose']);
	});
});
