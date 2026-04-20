import { describe, it, expect, vi } from 'vitest';
import type {
	ClientBinding,
	MiniACPAgent,
	MiniACPClient,
	ToolExecuteParams,
} from '@franklin/mini-acp';
import { connect } from '../connect.js';
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

describe('connect', () => {
	it('binds the server to the connection between server- and client-wrapping', async () => {
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

		const connection: ClientBinding = {
			remote: rawClient,
			bind() {
				order.push('bind');
				return { close: async () => {} };
			},
		};

		await connect({
			decorator,
			connection,
			fallbackServer: stubAgent(),
		});

		expect(order).toEqual(['server-wrap', 'bind', 'client-wrap']);
	});

	it('binds the wrapped server, not the fallback', async () => {
		let boundServer: MiniACPAgent | null = null;

		const wrappedAgent: MiniACPAgent = {
			toolExecute: vi.fn(async () => ({
				toolCallId: 'wrapped',
				content: [{ type: 'text' as const, text: 'wrapped' }],
			})),
		};

		const decorator: ProtocolDecorator = {
			name: 'test',
			async server() {
				return wrappedAgent;
			},
			async client(c) {
				return c;
			},
		};

		const connection: ClientBinding = {
			remote: stubClient(),
			bind(server) {
				boundServer = server;
				return { close: async () => {} };
			},
		};

		await connect({
			decorator,
			connection,
			fallbackServer: stubAgent(),
		});

		expect(boundServer).toBe(wrappedAgent);
	});

	it('returns the fully-wrapped client proxied from connection.remote', async () => {
		const rawClient = stubClient();

		const decorator: ProtocolDecorator = {
			name: 'identity',
			async server(a) {
				return a;
			},
			async client(c) {
				return c;
			},
		};

		const connection: ClientBinding = {
			remote: rawClient,
			bind() {
				return { close: async () => {} };
			},
		};

		const { client } = await connect({
			decorator,
			connection,
			fallbackServer: stubAgent(),
		});

		expect(client).toBe(rawClient);
	});
});
