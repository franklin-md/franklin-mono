import { afterEach, describe, expect, it } from 'vitest';

import { z } from 'zod';
import { createDuplexPair } from '@franklin/transport';
import {
	createAgentConnection,
	type MiniACPClient,
	type ClientProtocol,
	type AgentProtocol,
	type AgentBinding,
} from '@franklin/mini-acp';
import {
	createEmptyStoreResult,
	StorePool as StoreRegistry,
	type Extension,
	type CoreAPI,
	type StoreAPI,
} from '@franklin/extensions';
import { createAgent } from '../create.js';

function emptyStores() {
	const registry = new StoreRegistry();
	return createEmptyStoreResult(registry);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sets up a duplex pair with a mock agent on one end.
 * Returns the client-side transport (for createAgent) and the agent-side
 * connection (for verifying tool execution via the protocol).
 */
function createTestTransport(overrides: Partial<MiniACPClient> = {}): {
	clientTransport: ClientProtocol;
	agentConnection: AgentBinding;
} {
	const { a, b } = createDuplexPair();
	const clientTransport = a as unknown as ClientProtocol;
	const agentTransport = b as unknown as AgentProtocol;

	const handlers: MiniACPClient = {
		async initialize() {
			return {};
		},
		async setContext() {
			return {};
		},
		async *prompt() {
			yield { type: 'turnEnd' as const };
		},
		async cancel() {
			return;
		},
		...overrides,
	};

	const agentConnection = createAgentConnection(agentTransport);
	agentConnection.bind(handlers);
	return { clientTransport, agentConnection };
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

	it('exposes command methods at the top level', async () => {
		const { clientTransport } = createTestTransport();
		const agent = track(await createAgent([], clientTransport, emptyStores()));

		expect(typeof agent.prompt).toBe('function');
		expect(typeof agent.cancel).toBe('function');
		expect(typeof agent.initialize).toBe('function');
		expect(typeof agent.setContext).toBe('function');
	});

	it('exposes dispose', async () => {
		const { clientTransport } = createTestTransport();
		const agent = track(await createAgent([], clientTransport, emptyStores()));

		expect(typeof agent.dispose).toBe('function');
	});

	it('toolExecute returns error for unknown tools', async () => {
		const { clientTransport, agentConnection } = createTestTransport();
		track(await createAgent([], clientTransport, emptyStores()));

		const result = await agentConnection.remote.toolExecute({
			call: {
				type: 'toolCall',
				id: '1',
				name: 'nonexistent',
				arguments: {},
			},
		});

		expect(result.isError).toBe(true);
		expect(result.content[0]).toEqual({
			type: 'text',
			text: 'Unknown tool: nonexistent',
		});
	});

	it('exposes stores from compiled extensions', async () => {
		const ext: Extension<CoreAPI & StoreAPI> = (api) => {
			api.registerStore('items', [], 'private');
		};

		const { clientTransport } = createTestTransport();
		const agent = track(
			await createAgent([ext], clientTransport, emptyStores()),
		);

		expect(agent.stores.get('items')).toBeDefined();
		expect(agent.stores.get('items')!.store.get()).toEqual([]);
	});

	it('wraps client methods with extension middleware', async () => {
		const captured: string[] = [];

		const ext: Extension<CoreAPI & StoreAPI> = (api) => {
			api.on('prompt', (_params) => {
				captured.push('intercepted');
				return undefined;
			});
		};

		const { clientTransport } = createTestTransport();
		const agent = track(
			await createAgent([ext], clientTransport, emptyStores()),
		);

		// prompt is an async generator — iterate it to drain
		const stream = agent.prompt({
			message: { role: 'user', content: [{ type: 'text', text: 'hello' }] },
		});
		for await (const _event of stream) {
			// drain
		}

		expect(captured).toEqual(['intercepted']);
	});

	it('extension-registered tools are handled via toolExecute', async () => {
		const ext: Extension<CoreAPI & StoreAPI> = (api) => {
			api.registerTool({
				name: 'greet',
				description: 'Says hello',
				schema: z.object({}),
				execute: async () => ({
					content: [{ type: 'text' as const, text: 'Hello!' }],
				}),
			});
		};

		const { clientTransport, agentConnection } = createTestTransport();
		track(await createAgent([ext], clientTransport, emptyStores()));

		const result = await agentConnection.remote.toolExecute({
			call: { type: 'toolCall', id: '1', name: 'greet', arguments: {} },
		});

		expect(result.isError).toBeUndefined();
		// Tool execute middleware JSON-serializes the extension's return value
		expect(result.content[0]).toEqual({
			type: 'text',
			text: JSON.stringify({
				content: [{ type: 'text', text: 'Hello!' }],
			}),
		});
	});

	it('reuses stores from an existing StoreResult seed', async () => {
		const ext: Extension<CoreAPI & StoreAPI> = (api) => {
			const store = api.registerStore('items', [] as string[], 'inherit');
			if (store.get().length === 0) {
				store.set((items) => {
					items.push('seeded');
				});
			}
		};

		const { clientTransport: parentTransport } = createTestTransport();
		const parent = track(
			await createAgent([ext], parentTransport, emptyStores()),
		);

		const { clientTransport: childTransport } = createTestTransport();
		const child = track(
			await createAgent([ext], childTransport, parent.stores.share()),
		);

		expect(child.stores.get('items')!.store.get()).toEqual(['seeded']);
		expect(child.stores.get('items')!.ref).toBe(
			parent.stores.get('items')!.ref,
		);
	});
});
