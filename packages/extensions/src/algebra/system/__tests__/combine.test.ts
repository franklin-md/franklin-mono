import { describe, it, expect, vi } from 'vitest';
import { FILESYSTEM_ALLOW_ALL, type AbsolutePath } from '@franklin/lib';
import { combine } from '../combine.js';
import { createRuntime } from '../create.js';
import { createEnvironmentSystem } from '../../../systems/environment/system.js';
import { createStoreSystem } from '../../../systems/store/system.js';
import { createCoreSystem } from '../../../systems/core/system.js';
import { StoreRegistry } from '../../../systems/store/api/registry/index.js';
import type {
	EnvironmentConfig,
	ReconfigurableEnvironment,
} from '../../../systems/environment/api/types.js';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/lib/transport';
import {
	createSessionAdapter,
	createAgentConnection,
	StopCode,
	ZERO_USAGE,
	type Update,
	type StreamEvent,
} from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultEnvConfig: EnvironmentConfig = {
	fsConfig: {
		cwd: '/project' as AbsolutePath,
		permissions: FILESYSTEM_ALLOW_ALL,
	},
	netConfig: { allowedDomains: [], deniedDomains: [] },
};

function mockEnvironment(config: EnvironmentConfig): ReconfigurableEnvironment {
	return {
		filesystem: {
			readFile: vi.fn(),
			writeFile: vi.fn(),
			mkdir: vi.fn(),
			access: vi.fn(),
			stat: vi.fn(),
			readdir: vi.fn(),
			exists: vi.fn(),
			glob: vi.fn(),
			deleteFile: vi.fn(),
			resolve: vi.fn(
				async (...paths: string[]) => paths[paths.length - 1]! as AbsolutePath,
			),
		},
		terminal: { exec: vi.fn() },
		web: { fetch: vi.fn() },
		config: vi.fn(async () => ({ ...config })),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

function mockEnvFactory() {
	return async (config: EnvironmentConfig) => mockEnvironment(config);
}

function createMockSpawn() {
	return async () => {
		const { a: clientSide, b: agentSide } = createDuplexPair<JsonRpcMessage>();
		const connection = createAgentConnection(agentSide);

		const adapter = createSessionAdapter(
			(_ctx) => ({
				async *prompt() {
					yield {
						type: 'update' as const,
						messageId: 'm1',
						message: {
							role: 'assistant' as const,
							content: [{ type: 'text' as const, text: 'hello' }],
						},
					} satisfies Update;
					yield {
						type: 'turnEnd' as const,
						stopCode: StopCode.Finished,
					};
				},
				async cancel() {},
			}),
			connection.remote,
		);
		connection.bind(adapter);

		return {
			...clientSide,
			dispose: vi.fn(async () => {}),
		};
	};
}

async function collect(
	iter: AsyncIterable<StreamEvent>,
): Promise<StreamEvent[]> {
	const items: StreamEvent[] = [];
	for await (const item of iter) items.push(item);
	return items;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('combine — two systems', () => {
	it('combines store + environment systems', async () => {
		const system = combine(
			createStoreSystem(new StoreRegistry()),
			createEnvironmentSystem(mockEnvFactory()),
		);

		const runtime = await createRuntime(
			system,
			{ store: {}, env: defaultEnvConfig },
			[
				(api) => {
					api.registerStore('count', 0, 'private');
				},
			],
		);

		expect(runtime.getStore<number>('count').get()).toBe(0);
		expect(runtime.environment).toBeDefined();

		await runtime.dispose();
	});

	it('emptyState merges both systems', () => {
		const system = combine(
			createStoreSystem(new StoreRegistry()),
			createEnvironmentSystem(mockEnvFactory()),
		);

		const empty = system.emptyState();
		expect(empty.store).toEqual({});
		expect(empty.env).toBeDefined();
		expect(empty.env.fsConfig.cwd).toBeDefined();
	});

	it('state returns keyed state from both systems', async () => {
		const system = combine(
			createStoreSystem(new StoreRegistry()),
			createEnvironmentSystem(mockEnvFactory()),
		);

		const runtime = await createRuntime(
			system,
			{ store: {}, env: defaultEnvConfig },
			[
				(api) => {
					api.registerStore('x', 42, 'shared');
				},
			],
		);

		const state = await runtime.state();
		expect(state.store).toBeDefined();
		expect(Object.keys(state.store)).toContain('x');
		expect(state.env).toEqual(defaultEnvConfig);

		await runtime.dispose();
	});

	it('dispose calls both systems', async () => {
		const envDispose = vi.fn(async () => {});
		const envFactory = async (config: EnvironmentConfig) => ({
			...mockEnvironment(config),
			dispose: envDispose,
		});

		const system = combine(
			createStoreSystem(new StoreRegistry()),
			createEnvironmentSystem(envFactory),
		);

		const runtime = await createRuntime(
			system,
			{ store: {}, env: defaultEnvConfig },
			[],
		);

		await runtime.dispose();
		expect(envDispose).toHaveBeenCalled();
	});

	it('fork composes both fork outputs', async () => {
		const system = combine(
			createStoreSystem(new StoreRegistry()),
			createEnvironmentSystem(mockEnvFactory()),
		);

		const runtime = await createRuntime(
			system,
			{ store: {}, env: defaultEnvConfig },
			[
				(api) => {
					api.registerStore('data', 1, 'private');
				},
			],
		);

		const forked = await runtime.fork();
		expect(forked.store).toBeDefined();
		expect(forked.env).toBeDefined();
		expect(Object.keys(forked.store)).toContain('data');

		await runtime.dispose();
	});
});

describe('combine — three systems (nested)', () => {
	it('combines core + (store + environment)', async () => {
		const system = combine(
			createCoreSystem(createMockSpawn()),
			combine(
				createStoreSystem(new StoreRegistry()),
				createEnvironmentSystem(mockEnvFactory()),
			),
		);

		const runtime = await createRuntime(
			system,
			{
				core: { messages: [], llmConfig: {}, usage: ZERO_USAGE },
				store: {},
				env: defaultEnvConfig,
			},
			[
				(api) => {
					api.registerStore('notes', '', 'private');
				},
			],
		);

		expect(runtime.prompt).toBeDefined();
		expect(runtime.getStore<string>('notes')).toBeDefined();
		expect(runtime.environment).toBeDefined();

		await runtime.dispose();
	});

	it('emptyState has all three keys', () => {
		const system = combine(
			createCoreSystem(createMockSpawn()),
			combine(
				createStoreSystem(new StoreRegistry()),
				createEnvironmentSystem(mockEnvFactory()),
			),
		);

		const empty = system.emptyState();
		expect(empty.core).toBeDefined();
		expect(empty.store).toBeDefined();
		expect(empty.env).toBeDefined();
	});

	it('state has all three keyed sections', async () => {
		const system = combine(
			createCoreSystem(createMockSpawn()),
			combine(
				createStoreSystem(new StoreRegistry()),
				createEnvironmentSystem(mockEnvFactory()),
			),
		);

		const runtime = await createRuntime(
			system,
			{
				core: { messages: [], llmConfig: {}, usage: ZERO_USAGE },
				store: {},
				env: defaultEnvConfig,
			},
			[],
		);

		const state = await runtime.state();
		expect(state.core).toBeDefined();
		expect(state.core.messages).toBeDefined();
		expect(state.store).toBeDefined();
		expect(state.env).toBeDefined();

		await runtime.dispose();
	});

	it('prompt works through combined system', async () => {
		const system = combine(
			createCoreSystem(createMockSpawn()),
			combine(
				createStoreSystem(new StoreRegistry()),
				createEnvironmentSystem(mockEnvFactory()),
			),
		);

		const runtime = await createRuntime(
			system,
			{
				core: { messages: [], llmConfig: {}, usage: ZERO_USAGE },
				store: {},
				env: defaultEnvConfig,
			},
			[],
		);

		const events = await collect(
			runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		expect(events.some((e) => e.type === 'update')).toBe(true);

		await runtime.dispose();
	});

	it('fork produces full combined state', async () => {
		const system = combine(
			createCoreSystem(createMockSpawn()),
			combine(
				createStoreSystem(new StoreRegistry()),
				createEnvironmentSystem(mockEnvFactory()),
			),
		);

		const runtime = await createRuntime(
			system,
			{
				core: {
					messages: [
						{
							role: 'user',
							content: [{ type: 'text', text: 'hello' }],
						},
					],
					llmConfig: { model: 'gpt-4' },
					usage: ZERO_USAGE,
				},
				store: {},
				env: defaultEnvConfig,
			},
			[
				(api) => {
					api.registerStore('data', 0, 'private');
				},
			],
		);

		const forked = await runtime.fork();
		expect(forked.core.messages).toHaveLength(1);
		expect(forked.core.llmConfig.model).toBe('gpt-4');
		expect(forked.store).toBeDefined();
		expect(forked.env).toEqual(defaultEnvConfig);

		await runtime.dispose();
	});
});
