import { describe, it, expect, vi } from 'vitest';
import type {
	MiniACPAgent,
	MiniACPClient,
	ToolExecuteParams,
} from '@franklin/mini-acp';
import { applyDecorators } from '../decorator.js';
import type { ProtocolDecorator } from '../decorator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stubAgent(): MiniACPAgent {
	return {
		toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
			toolCallId: call.id,
			content: [{ type: 'text' as const, text: 'base' }],
		})),
	};
}

function stubClient(): MiniACPClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async () => {}),
		prompt: vi.fn(async function* () {}),
		cancel: vi.fn(async () => ({ type: 'turn_end' as const, turn: 'end' })),
	} as unknown as MiniACPClient;
}

// ---------------------------------------------------------------------------
// applyDecorators — wrapping order
// ---------------------------------------------------------------------------

describe('applyDecorators', () => {
	it('applies server decorators forward (first = innermost)', async () => {
		const calls: string[] = [];

		const inner: ProtocolDecorator = {
			name: 'inner',
			async server(a) {
				return {
					toolExecute: async (params) => {
						calls.push('inner');
						return a.toolExecute(params);
					},
				};
			},
			async client(c) {
				return c;
			},
		};

		const outer: ProtocolDecorator = {
			name: 'outer',
			async server(a) {
				return {
					toolExecute: async (params) => {
						calls.push('outer');
						return a.toolExecute(params);
					},
				};
			},
			async client(c) {
				return c;
			},
		};

		const base = { server: stubAgent(), client: stubClient() };
		const result = await applyDecorators([inner, outer], base);

		await result.server.toolExecute({
			call: { type: 'toolCall', id: 'c1', name: 'test', arguments: {} },
		});

		// outer wraps inner wraps base → outer sees call first
		expect(calls).toEqual(['outer', 'inner']);
	});

	it('applies client decorators in reverse (first in stack = outermost on client)', async () => {
		const calls: string[] = [];

		const layerA: ProtocolDecorator = {
			name: 'A',
			async server(a) {
				return a;
			},
			async client(c) {
				return {
					...c,
					setContext: async (ctx: unknown) => {
						calls.push('A');
						return c.setContext(
							ctx as Parameters<MiniACPClient['setContext']>[0],
						);
					},
				} as unknown as MiniACPClient;
			},
		};

		const layerB: ProtocolDecorator = {
			name: 'B',
			async server(a) {
				return a;
			},
			async client(c) {
				return {
					...c,
					setContext: async (ctx: unknown) => {
						calls.push('B');
						return c.setContext(
							ctx as Parameters<MiniACPClient['setContext']>[0],
						);
					},
				} as unknown as MiniACPClient;
			},
		};

		const base = { server: stubAgent(), client: stubClient() };
		// Stack [A, B]:
		//   Server: B(A(base)) → B outermost
		//   Client reversed: A(B(base)) → A outermost
		const result = await applyDecorators([layerA, layerB], base);

		await result.client.setContext({});

		// A is outermost on client side, sees call first
		expect(calls).toEqual(['A', 'B']);
	});

	it('async client decorator can call methods on inner client during setup', async () => {
		const setContextCalls: unknown[] = [];
		const base = {
			server: stubAgent(),
			client: {
				...stubClient(),
				setContext: vi.fn(async (ctx: unknown) => {
					setContextCalls.push(ctx);
				}),
			} as unknown as MiniACPClient,
		};

		const decorator: ProtocolDecorator = {
			name: 'seeder',
			async server(a) {
				return a;
			},
			async client(c) {
				// Setup: call setContext on inner client during wrapping
				await c.setContext({ tools: [], config: { model: 'test' } });
				return c;
			},
		};

		await applyDecorators([decorator], base);

		expect(setContextCalls).toHaveLength(1);
		expect(setContextCalls[0]).toEqual({
			tools: [],
			config: { model: 'test' },
		});
	});

	it('runs client setup in reverse order (innermost setup first)', async () => {
		const order: string[] = [];

		const first: ProtocolDecorator = {
			name: 'first',
			async server(a) {
				return a;
			},
			async client(c) {
				order.push('first-setup');
				return c;
			},
		};

		const second: ProtocolDecorator = {
			name: 'second',
			async server(a) {
				return a;
			},
			async client(c) {
				order.push('second-setup');
				return c;
			},
		};

		const base = { server: stubAgent(), client: stubClient() };
		// Stack [first, second] → client reversed → second.client runs first
		await applyDecorators([first, second], base);

		expect(order).toEqual(['second-setup', 'first-setup']);
	});

	it('empty stack returns base unchanged', async () => {
		const base = { server: stubAgent(), client: stubClient() };
		const result = await applyDecorators([], base);

		expect(result.server).toBe(base.server);
		expect(result.client).toBe(base.client);
	});

	it('onServerReady fires after server wrapping, before client wrapping', async () => {
		const order: string[] = [];

		const decorator: ProtocolDecorator = {
			name: 'test',
			async server(a) {
				order.push('server-wrap');
				return a;
			},
			async client(c) {
				order.push('client-wrap');
				return c;
			},
		};

		const base = { server: stubAgent(), client: stubClient() };
		await applyDecorators([decorator], base, async () => {
			order.push('onServerReady');
		});

		expect(order).toEqual(['server-wrap', 'onServerReady', 'client-wrap']);
	});
});
