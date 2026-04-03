import { describe, it, expect, vi } from 'vitest';
import { CtxTracker } from '@franklin/mini-acp';
import type { MiniACPClient } from '@franklin/mini-acp';
import { seedTracker, initializeRawClient } from '../seed.js';
import type { CoreState } from '../../../state/core.js';

// ---------------------------------------------------------------------------
// seedTracker
// ---------------------------------------------------------------------------

describe('seedTracker', () => {
	it('sets history on the tracker', () => {
		const tracker = new CtxTracker();
		const core: CoreState['core'] = {
			history: {
				systemPrompt: 'You are helpful',
				messages: [
					{
						role: 'user',
						content: [{ type: 'text', text: 'hello' }],
					},
				],
			},
			llmConfig: {},
		};

		seedTracker(tracker, core);

		const ctx = tracker.get();
		expect(ctx.history.systemPrompt).toBe('You are helpful');
		expect(ctx.history.messages).toHaveLength(1);
		expect(ctx.history.messages[0]).toEqual({
			role: 'user',
			content: [{ type: 'text', text: 'hello' }],
		});
	});

	it('sets llmConfig on the tracker', () => {
		const tracker = new CtxTracker();
		const core: CoreState['core'] = {
			history: { systemPrompt: '', messages: [] },
			llmConfig: { model: 'test-model', provider: 'test-provider' },
		};

		seedTracker(tracker, core);

		const ctx = tracker.get();
		expect(ctx.config?.model).toBe('test-model');
		expect(ctx.config?.provider).toBe('test-provider');
	});

	it('copies messages so tracker does not share references', () => {
		const tracker = new CtxTracker();
		const messages = [
			{
				role: 'user' as const,
				content: [{ type: 'text' as const, text: 'hi' }],
			},
		];
		const core: CoreState['core'] = {
			history: { systemPrompt: '', messages },
			llmConfig: {},
		};

		seedTracker(tracker, core);

		const ctx = tracker.get();
		expect(ctx.history.messages).not.toBe(messages);
		expect(ctx.history.messages).toEqual(messages);
	});

	it('copies llmConfig so tracker does not share references', () => {
		const tracker = new CtxTracker();
		const llmConfig = { model: 'test' };
		const core: CoreState['core'] = {
			history: { systemPrompt: '', messages: [] },
			llmConfig,
		};

		seedTracker(tracker, core);

		const ctx = tracker.get();
		expect(ctx.config).not.toBe(llmConfig);
		expect(ctx.config).toEqual(llmConfig);
	});

	it('sets empty tools array', () => {
		const tracker = new CtxTracker();
		seedTracker(tracker, {
			history: { systemPrompt: '', messages: [] },
			llmConfig: {},
		});

		expect(tracker.get().tools).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// initializeRawClient
// ---------------------------------------------------------------------------

function stubRawClient(): MiniACPClient & {
	initializeCalls: unknown[];
	setContextCalls: unknown[];
} {
	const initializeCalls: unknown[] = [];
	const setContextCalls: unknown[] = [];

	return {
		initializeCalls,
		setContextCalls,
		initialize: vi.fn(async (params) => {
			initializeCalls.push(params);
		}),
		setContext: vi.fn(async (params) => {
			setContextCalls.push(params);
		}),
		prompt: vi.fn(async function* () {}),
		cancel: vi.fn(async () => ({
			type: 'turn_end' as const,
			turn: 'end',
		})),
	} as unknown as MiniACPClient & {
		initializeCalls: unknown[];
		setContextCalls: unknown[];
	};
}

describe('initializeRawClient', () => {
	it('calls initialize then setContext on the client', async () => {
		const client = stubRawClient();
		const core: CoreState['core'] = {
			history: {
				systemPrompt: 'You are helpful',
				messages: [
					{
						role: 'user',
						content: [{ type: 'text', text: 'hello' }],
					},
				],
			},
			llmConfig: { model: 'test-model' },
		};

		await initializeRawClient(client, core);

		expect(client.initializeCalls).toHaveLength(1);
		expect(client.initializeCalls[0]).toEqual({});

		expect(client.setContextCalls).toHaveLength(1);
		const ctxParam = client.setContextCalls[0] as {
			ctx: {
				history: { systemPrompt: string; messages: unknown[] };
				tools: unknown[];
				config: { model: string };
			};
		};
		expect(ctxParam.ctx.history.systemPrompt).toBe('You are helpful');
		expect(ctxParam.ctx.history.messages).toHaveLength(1);
		expect(ctxParam.ctx.tools).toEqual([]);
		expect(ctxParam.ctx.config.model).toBe('test-model');
	});

	it('copies messages so raw client does not share references', async () => {
		const client = stubRawClient();
		const messages = [
			{
				role: 'user' as const,
				content: [{ type: 'text' as const, text: 'hi' }],
			},
		];
		const core: CoreState['core'] = {
			history: { systemPrompt: '', messages },
			llmConfig: {},
		};

		await initializeRawClient(client, core);

		const ctxParam = client.setContextCalls[0] as {
			ctx: { history: { messages: unknown[] } };
		};
		expect(ctxParam.ctx.history.messages).not.toBe(messages);
		expect(ctxParam.ctx.history.messages).toEqual(messages);
	});

	it('copies llmConfig so raw client does not share references', async () => {
		const client = stubRawClient();
		const llmConfig = { model: 'test', provider: 'p' };
		const core: CoreState['core'] = {
			history: { systemPrompt: '', messages: [] },
			llmConfig,
		};

		await initializeRawClient(client, core);

		const ctxParam = client.setContextCalls[0] as {
			ctx: { config: unknown };
		};
		expect(ctxParam.ctx.config).not.toBe(llmConfig);
		expect(ctxParam.ctx.config).toEqual(llmConfig);
	});
});

// ---------------------------------------------------------------------------
// Integration: seed + initializeRawClient keep tracker and client in sync
// ---------------------------------------------------------------------------

describe('seed integration', () => {
	it('tracker and raw client receive the same state', async () => {
		const tracker = new CtxTracker();
		const client = stubRawClient();
		const core: CoreState['core'] = {
			history: {
				systemPrompt: 'sys',
				messages: [
					{
						role: 'user',
						content: [{ type: 'text', text: 'msg' }],
					},
				],
			},
			llmConfig: { model: 'claude', provider: 'anthropic' },
		};

		seedTracker(tracker, core);
		await initializeRawClient(client, core);

		const trackerCtx = tracker.get();
		const clientCtx = (client.setContextCalls[0] as { ctx: typeof trackerCtx })
			.ctx;

		expect(trackerCtx.history.systemPrompt).toBe(
			clientCtx.history.systemPrompt,
		);
		expect(trackerCtx.history.messages).toEqual(clientCtx.history.messages);
		expect(trackerCtx.config).toEqual(clientCtx.config);
	});
});
