import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AnyMessage } from '@agentclientprotocol/sdk';

import type { McpToolStream } from '@franklin/local-mcp';

import { createStore } from '../../store/index.js';
import type { Store } from '../../store/index.js';
import type { Extension, ExtensionAPI } from '../../extensions/types/index.js';
import type { McpTransportFactory } from '../../extensions/compile/start.js';
import type { AgentTransport } from '../../transport/index.js';
import { createAgent } from '../create.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock transport that accepts writes and never produces reads.
 * Avoids ACP SDK stream processing and unhandled rejections in unit tests.
 */
function createMockTransport(): {
	transport: AgentTransport;
	closeFn: ReturnType<typeof vi.fn>;
} {
	const closeFn = vi.fn(async () => {});

	const readable = new ReadableStream<AnyMessage>({
		pull() {
			return new Promise<void>(() => {});
		},
		cancel() {},
	});

	const writable = new WritableStream<AnyMessage>({
		write() {},
		close() {},
		abort() {},
	});

	return {
		transport: { readable, writable, close: closeFn },
		closeFn,
	};
}

/**
 * Creates a mock MCP transport factory for extension compilation.
 */
function createMockToolTransport(): McpTransportFactory {
	return async (_name) => {
		const mockStream = {
			readable: new ReadableStream<never>(),
			writable: new WritableStream<never>(),
			close: async () => {},
		} as unknown as McpToolStream;

		return {
			config: {
				name: 'test-relay',
				command: 'node',
				args: ['--version'],
				env: [{ name: 'STUB', value: 'true' }],
			},
			stream: mockStream,
			dispose: vi.fn(async () => {}),
		};
	};
}

// ---------------------------------------------------------------------------
// Test extensions
// ---------------------------------------------------------------------------

interface Item {
	id: string;
	text: string;
}

class StatefulExtension implements Extension<Item[]> {
	readonly name = 'items';
	readonly state: Store<Item[]> = createStore<Item[]>([]);
	async setup(_api: ExtensionAPI): Promise<void> {}
}

class StatelessExtension implements Extension {
	readonly name = 'logger';
	async setup(_api: ExtensionAPI): Promise<void> {}
}

class AnotherStatefulExtension implements Extension<number> {
	readonly name = 'counter';
	readonly state: Store<number> = createStore<number>(0);
	async setup(_api: ExtensionAPI): Promise<void> {}
}

// ---------------------------------------------------------------------------
// createAgent
// ---------------------------------------------------------------------------

describe('createAgent', () => {
	const agents: { dispose: () => Promise<void> }[] = [];

	afterEach(async () => {
		for (const a of agents) {
			await a.dispose().catch(() => {});
		}
		agents.length = 0;
	});

	function track<T extends { dispose: () => Promise<void> }>(agent: T): T {
		agents.push(agent);
		return agent;
	}

	it('attaches stateful extension stores at agent.<name>', async () => {
		const ext = new StatefulExtension();
		const { transport } = createMockTransport();
		const agent = track(
			await createAgent([ext], transport, createMockToolTransport()),
		);

		expect(agent.items).toBe(ext.state);
		expect(agent.items.get()).toEqual([]);
	});

	it('does not attach properties for stateless extensions', async () => {
		const ext = new StatelessExtension();
		const { transport } = createMockTransport();
		const agent = track(
			await createAgent([ext], transport, createMockToolTransport()),
		);

		expect(
			(agent as unknown as Record<string, unknown>)['logger'],
		).toBeUndefined();
	});

	it('handles multiple extensions with mixed state', async () => {
		const stateful = new StatefulExtension();
		const stateless = new StatelessExtension();
		const counter = new AnotherStatefulExtension();
		const { transport } = createMockTransport();

		const agent = track(
			await createAgent(
				[stateful, stateless, counter],
				transport,
				createMockToolTransport(),
			),
		);

		expect(agent.items).toBe(stateful.state);
		expect(agent.counter).toBe(counter.state);
		expect(
			(agent as unknown as Record<string, unknown>)['logger'],
		).toBeUndefined();
	});

	it('exposes command methods at the top level', async () => {
		const { transport } = createMockTransport();
		const agent = track(
			await createAgent([], transport, createMockToolTransport()),
		);

		expect(typeof agent.prompt).toBe('function');
		expect(typeof agent.cancel).toBe('function');
		expect(typeof agent.initialize).toBe('function');
		expect(typeof agent.newSession).toBe('function');
		expect(typeof agent.loadSession).toBe('function');
		expect(typeof agent.listSessions).toBe('function');
		expect(typeof agent.setSessionMode).toBe('function');
		expect(typeof agent.setSessionConfigOption).toBe('function');
		expect(typeof agent.authenticate).toBe('function');
	});

	it('exposes lifecycle properties', async () => {
		const { transport } = createMockTransport();
		const agent = track(
			await createAgent([], transport, createMockToolTransport()),
		);

		expect(typeof agent.dispose).toBe('function');
		expect(agent.signal).toBeInstanceOf(AbortSignal);
		expect(agent.closed).toBeInstanceOf(Promise);
	});

	it('compiles extensions and wires prompt hooks', async () => {
		const captured: string[] = [];

		class HookExtension implements Extension {
			readonly name = 'hook';
			async setup(api: ExtensionAPI): Promise<void> {
				api.on('prompt', async (ctx) => {
					captured.push('intercepted');
					return { prompt: ctx.prompt };
				});
			}
		}

		const { transport } = createMockTransport();
		const agent = track(
			await createAgent(
				[new HookExtension()],
				transport,
				createMockToolTransport(),
			),
		);

		// Fire-and-forget — no agent on the other side to respond.
		const promptCall = agent.prompt({
			sessionId: 'test',
			prompt: [{ type: 'text', text: 'hello' }],
		});
		promptCall.catch(() => {});

		// The transport-wrapping middleware processes writes asynchronously
		// through the streams API, so we yield to let the handler fire.
		await new Promise((r) => setTimeout(r, 0));

		expect(captured).toEqual(['intercepted']);
	});

	it('dispose tears down transport', async () => {
		const { transport, closeFn } = createMockTransport();
		const agent = await createAgent([], transport, createMockToolTransport());

		await agent.dispose();
		expect(closeFn).toHaveBeenCalledOnce();
	});

	it('store mutations are visible through the agent handle', async () => {
		const ext = new StatefulExtension();
		const { transport } = createMockTransport();
		const agent = track(
			await createAgent([ext], transport, createMockToolTransport()),
		);

		ext.state.set((draft) => {
			draft.push({ id: '1', text: 'test' });
		});

		expect(agent.items.get()).toEqual([{ id: '1', text: 'test' }]);
	});

	it('store subscriptions work through the agent handle', async () => {
		const ext = new AnotherStatefulExtension();
		const { transport } = createMockTransport();
		const agent = track(
			await createAgent([ext], transport, createMockToolTransport()),
		);

		const values: number[] = [];
		agent.counter.subscribe((v) => values.push(v));

		ext.state.set(() => 1);
		ext.state.set(() => 2);

		expect(values).toEqual([1, 2]);
	});
});
