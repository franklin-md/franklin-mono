import { describe, it, expect, vi } from 'vitest';
import type {
	ClientBinding,
	MiniACPAgent,
	MiniACPClient,
	ToolExecuteParams,
} from '@franklin/mini-acp';
import { composeProtocol } from '../decorator.js';
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

/**
 * In-memory `ClientBinding` stub that records which server is bound
 * and exposes the client proxy as the base raw client.
 */
function stubConnection(client: MiniACPClient = stubClient()): {
	binding: ClientBinding;
	boundServer: { current: MiniACPAgent | null };
} {
	const boundServer: { current: MiniACPAgent | null } = { current: null };
	const binding: ClientBinding = {
		remote: client,
		bind(server) {
			boundServer.current = server;
			return { close: async () => {} };
		},
	};
	return { binding, boundServer };
}

// ---------------------------------------------------------------------------
// composeProtocol — wrapping order + transport binding
// ---------------------------------------------------------------------------

describe('composeProtocol', () => {
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

		const { binding, boundServer } = stubConnection();
		await composeProtocol({
			stack: [inner, outer],
			connection: binding,
			fallbackServer: stubAgent(),
		});

		await boundServer.current?.toolExecute({
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

		const { binding } = stubConnection();
		// Stack [A, B]:
		//   Server: B(A(base)) → B outermost
		//   Client reversed: A(B(base)) → A outermost
		const { client } = await composeProtocol({
			stack: [layerA, layerB],
			connection: binding,
			fallbackServer: stubAgent(),
		});

		await client.setContext({});

		// A is outermost on client side, sees call first
		expect(calls).toEqual(['A', 'B']);
	});

	it('async client decorator can call methods on inner client during setup', async () => {
		const setContextCalls: unknown[] = [];
		const client = {
			...stubClient(),
			setContext: vi.fn(async (ctx: unknown) => {
				setContextCalls.push(ctx);
			}),
		} as unknown as MiniACPClient;

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

		const { binding } = stubConnection(client);
		await composeProtocol({
			stack: [decorator],
			connection: binding,
			fallbackServer: stubAgent(),
		});

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

		const { binding } = stubConnection();
		// Stack [first, second] → client reversed → second.client runs first
		await composeProtocol({
			stack: [first, second],
			connection: binding,
			fallbackServer: stubAgent(),
		});

		expect(order).toEqual(['second-setup', 'first-setup']);
	});

	it('empty stack binds fallback and returns raw client unchanged', async () => {
		const rawClient = stubClient();
		const fallback = stubAgent();
		const { binding, boundServer } = stubConnection(rawClient);

		const { client } = await composeProtocol({
			stack: [],
			connection: binding,
			fallbackServer: fallback,
		});

		expect(client).toBe(rawClient);
		expect(boundServer.current).toBe(fallback);
	});

	it('binds the fully-composed server to the connection before wrapping clients', async () => {
		const order: string[] = [];
		const rawClient = stubClient();

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

		const binding: ClientBinding = {
			remote: rawClient,
			bind() {
				order.push('bind');
				return { close: async () => {} };
			},
		};

		await composeProtocol({
			stack: [decorator],
			connection: binding,
			fallbackServer: stubAgent(),
		});

		expect(order).toEqual(['server-wrap', 'bind', 'client-wrap']);
	});
});
