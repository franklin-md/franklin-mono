import { describe, it, expect, vi } from 'vitest';
import type {
	MiniACPAgent,
	MiniACPClient,
	ToolExecuteParams,
} from '@franklin/mini-acp';
import { compose } from '../compose.js';
import type { ProtocolDecorator } from '../types.js';

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

describe('compose', () => {
	it('folds server decorators forward (first = innermost)', async () => {
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

		const decorator = compose([inner, outer]);
		const wrapped = await decorator.server(stubAgent());

		await wrapped.toolExecute({
			call: { type: 'toolCall', id: 'c1', name: 'test', arguments: {} },
		});

		// outer wraps inner wraps base → outer sees call first
		expect(calls).toEqual(['outer', 'inner']);
	});

	it('folds client decorators in reverse (first = outermost)', async () => {
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

		const decorator = compose([layerA, layerB]);
		const wrapped = await decorator.client(stubClient());

		await wrapped.setContext({});

		// A is outermost on client side, sees call first
		expect(calls).toEqual(['A', 'B']);
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

		const decorator = compose([first, second]);
		await decorator.client(stubClient());

		expect(order).toEqual(['second-setup', 'first-setup']);
	});

	it('empty stack returns base unchanged on both sides', async () => {
		const decorator = compose([]);
		const agent = stubAgent();
		const client = stubClient();

		expect(await decorator.server(agent)).toBe(agent);
		expect(await decorator.client(client)).toBe(client);
	});
});
