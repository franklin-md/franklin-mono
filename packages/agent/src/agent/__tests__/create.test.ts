import { afterEach, describe, expect, it, vi } from 'vitest';

import { z } from 'zod';
import type { MiniACPClient } from '@franklin/mini-acp';
import type { Extension, CoreAPI, StoreAPI } from '@franklin/extensions';
import { createAgent } from '../create.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type StubOverrides = {
	[K in keyof MiniACPClient]?: (...args: Parameters<MiniACPClient[K]>) => any;
};

function createStubClient(overrides: StubOverrides = {}): MiniACPClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async () => {}),
		// eslint-disable-next-line require-yield
		prompt: vi.fn(async function* () {
			return { type: 'turnEnd' as const, messageId: '1' };
		}),
		cancel: vi.fn(async () => ({
			type: 'turnEnd' as const,
			messageId: '1',
		})),
		...overrides,
	} as unknown as MiniACPClient;
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
		const client = createStubClient();
		const agent = track(await createAgent([], client));

		expect(typeof agent.prompt).toBe('function');
		expect(typeof agent.cancel).toBe('function');
		expect(typeof agent.initialize).toBe('function');
		expect(typeof agent.setContext).toBe('function');
	});

	it('exposes toolExecute handler', async () => {
		const client = createStubClient();
		const agent = track(await createAgent([], client));

		expect(typeof agent.toolExecute).toBe('function');
	});

	it('toolExecute returns error for unknown tools', async () => {
		const client = createStubClient();
		const agent = track(await createAgent([], client));

		const result = await agent.toolExecute({
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

	it('exposes lifecycle properties', async () => {
		const client = createStubClient();
		const agent = track(await createAgent([], client));

		expect(typeof agent.dispose).toBe('function');
		expect(agent.signal).toBeInstanceOf(AbortSignal);
		expect(agent.closed).toBeInstanceOf(Promise);
	});

	it('exposes stores from compiled extensions', async () => {
		const ext: Extension<CoreAPI & StoreAPI> = (api) => {
			api.registerStore('items', [], 'private');
		};

		const client = createStubClient();
		const agent = track(await createAgent([ext], client));

		expect(agent.stores.stores.get('items')).toBeDefined();
		expect(agent.stores.stores.get('items')!.store.get()).toEqual([]);
	});

	it('wraps client methods with extension middleware', async () => {
		const captured: string[] = [];

		const ext: Extension<CoreAPI & StoreAPI> = (api) => {
			api.on('prompt', (_params) => {
				captured.push('intercepted');
				return undefined;
			});
		};

		const client = createStubClient();
		const agent = track(await createAgent([ext], client));

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

		const client = createStubClient();
		const agent = track(await createAgent([ext], client));

		const result = await agent.toolExecute({
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

	it('dispose aborts the signal', async () => {
		const client = createStubClient();
		const agent = await createAgent([], client);

		expect(agent.signal.aborted).toBe(false);
		await agent.dispose();
		expect(agent.signal.aborted).toBe(true);
	});
});
