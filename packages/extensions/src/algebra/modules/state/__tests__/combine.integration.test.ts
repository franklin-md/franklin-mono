import {
	type AbsolutePath,
	FILESYSTEM_ALLOW_ALL,
	MemoryOsInfo,
} from '@franklin/lib';
import {
	createSessionAdapter,
	StopCode,
	type MiniACPConnector,
	type StreamEvent,
	type Update,
	ZERO_USAGE,
} from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { createCoreStateModule } from '../../../../modules/core/module.js';
import type {
	EnvironmentConfig,
	ReconfigurableEnvironment,
} from '../../../../modules/environment/api/types.js';
import { createEnvironmentModule } from '../../../../modules/environment/module.js';
import { StoreRegistry } from '../../../../modules/store/api/registry/index.js';
import { createStoreStateModule } from '../../../../modules/store/state-module.js';
import { createRuntime } from '../../../../testing/index.js';
import type { Signature, StaticSignature } from '../../../api/types.js';
import { createExtensionPoint } from '../../../extension-points/create.js';
import { createApi } from '../../../extension-points/facade.js';
import type { RegistryView } from '../../../extension-points/view.js';
import { createRegistry } from '../../../extension-points/writer.js';
import type { ExtensionPoint } from '../../../extension-points/types.js';
import type { BaseRuntime } from '../../../runtime/types.js';
import { combine } from '../combine.js';
import { identityModule } from '../identity.js';
import type { StateExtensionModule, StateHandle } from '../index.js';

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
		process: { exec: vi.fn() },
		web: { fetch: vi.fn() },
		osInfo: new MemoryOsInfo(),
		config: vi.fn(async () => ({ ...config })),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

function mockEnvFactory() {
	return async (config: EnvironmentConfig) => mockEnvironment(config);
}

function createMockConnector(): MiniACPConnector {
	return (server) => {
		const client = createSessionAdapter(
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
			server,
		);

		return {
			...client,
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

type ValueAPI = {
	registerValue(value: number): void;
};

type ValueSignature = StaticSignature<ValueAPI>;

const valueExtensionPoint = createExtensionPoint<ValueSignature>({
	registerValue: true,
});

type ValueState = {
	value: number;
};

const VALUE_STATE: unique symbol = Symbol('test/value-state');

type ValueRuntime = BaseRuntime & {
	readonly label: string;
	currentValue(): number;
	readonly [VALUE_STATE]: StateHandle<ValueState>;
};

function createValueSystem(): StateExtensionModule<
	ValueState,
	ValueSignature,
	ValueRuntime
> {
	return {
		emptyState: () => ({ value: 0 }),
		state: (runtime) => runtime[VALUE_STATE],
		instantiate(state) {
			return {
				extensionPoint: valueExtensionPoint,
				compiler: {
					async compile<ContextRuntime extends BaseRuntime>(
						registry: RegistryView<ValueSignature, ContextRuntime>,
					) {
						const registeredValue = registry
							.argsFor('registerValue')
							.at(-1)?.[0];
						const value = registeredValue ?? state.value;
						return {
							label: 'value',
							currentValue() {
								return value;
							},
							[VALUE_STATE]: {
								get: vi.fn(async () => ({ value })),
								fork: vi.fn(async () => ({ value })),
								child: vi.fn(async () => ({ value })),
							},
							dispose: vi.fn(async () => {}),
						};
					},
				},
			};
		},
	};
}

function apiKeys<A extends Signature>(
	extensionPoint: ExtensionPoint<A>,
): string[] {
	const { writer } = createRegistry<A, A['In']>();
	return Object.keys(createApi<A, A['In']>(extensionPoint, writer));
}

function moduleApiKeys(module: StateExtensionModule<any, any, any>): string[] {
	return apiKeys(module.instantiate(module.emptyState()).extensionPoint);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('combine — two modules', () => {
	it('combines store + environment modules', async () => {
		const system = combine(
			createStoreStateModule(new StoreRegistry()),
			createEnvironmentModule(mockEnvFactory()),
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

	it('emptyState merges both modules', () => {
		const system = combine(
			createStoreStateModule(new StoreRegistry()),
			createEnvironmentModule(mockEnvFactory()),
		);

		const empty = system.emptyState();
		expect(empty.store).toEqual({});
		expect(empty.env).toBeDefined();
		expect(empty.env.fsConfig.cwd).toBeDefined();
	});

	it('state returns keyed state from both modules', async () => {
		const system = combine(
			createStoreStateModule(new StoreRegistry()),
			createEnvironmentModule(mockEnvFactory()),
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

		const state = await system.state(runtime).get();
		expect(state.store).toBeDefined();
		expect(Object.keys(state.store)).toContain('x');
		expect(state.env).toEqual(defaultEnvConfig);

		await runtime.dispose();
	});

	it('dispose calls both modules', async () => {
		const envDispose = vi.fn(async () => {});
		const envFactory = async (config: EnvironmentConfig) => ({
			...mockEnvironment(config),
			dispose: envDispose,
		});

		const system = combine(
			createStoreStateModule(new StoreRegistry()),
			createEnvironmentModule(envFactory),
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
			createStoreStateModule(new StoreRegistry()),
			createEnvironmentModule(mockEnvFactory()),
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

		const forked = await system.state(runtime).fork();
		expect(forked.store).toBeDefined();
		expect(forked.env).toBeDefined();
		expect(Object.keys(forked.store)).toContain('data');

		await runtime.dispose();
	});
});

describe('combine — three modules (nested)', () => {
	it('combines core + (store + environment)', async () => {
		const system = combine(
			createCoreStateModule(createMockConnector()),
			combine(
				createStoreStateModule(new StoreRegistry()),
				createEnvironmentModule(mockEnvFactory()),
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
			createCoreStateModule(createMockConnector()),
			combine(
				createStoreStateModule(new StoreRegistry()),
				createEnvironmentModule(mockEnvFactory()),
			),
		);

		const empty = system.emptyState();
		expect(empty.core).toBeDefined();
		expect(empty.store).toBeDefined();
		expect(empty.env).toBeDefined();
	});

	it('state has all three keyed sections', async () => {
		const system = combine(
			createCoreStateModule(createMockConnector()),
			combine(
				createStoreStateModule(new StoreRegistry()),
				createEnvironmentModule(mockEnvFactory()),
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

		const state = await system.state(runtime).get();
		expect(state.core).toBeDefined();
		expect(state.core.messages).toBeDefined();
		expect(state.store).toBeDefined();
		expect(state.env).toBeDefined();

		await runtime.dispose();
	});

	it('prompt works through combined system', async () => {
		const system = combine(
			createCoreStateModule(createMockConnector()),
			combine(
				createStoreStateModule(new StoreRegistry()),
				createEnvironmentModule(mockEnvFactory()),
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
			createCoreStateModule(createMockConnector()),
			combine(
				createStoreStateModule(new StoreRegistry()),
				createEnvironmentModule(mockEnvFactory()),
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

		const forked = await system.state(runtime).fork();
		expect(forked.core.messages).toHaveLength(1);
		expect(forked.core.llmConfig.model).toBe('gpt-4');
		expect(forked.store).toBeDefined();
		expect(forked.env).toEqual(defaultEnvConfig);

		await runtime.dispose();
	});
});

describe('combine — identity laws', () => {
	it('preserves emptyState, api, and runtime behaviour with left identity', async () => {
		const baseline = createValueSystem();
		const combined = combine(identityModule(), createValueSystem());

		expect(combined.emptyState()).toEqual(baseline.emptyState());
		expect(moduleApiKeys(combined)).toEqual(moduleApiKeys(baseline));

		const [baselineRuntime, combinedRuntime] = await Promise.all([
			createRuntime(baseline, { value: 1 }, [
				(api) => {
					api.registerValue(7);
				},
			]),
			createRuntime(combined, { value: 1 }, [
				(api) => {
					api.registerValue(7);
				},
			]),
		]);

		expect(combinedRuntime.label).toBe(baselineRuntime.label);
		expect(combinedRuntime.currentValue()).toBe(baselineRuntime.currentValue());
		await expect(combined.state(combinedRuntime).get()).resolves.toEqual(
			await baseline.state(baselineRuntime).get(),
		);

		await Promise.all([baselineRuntime.dispose(), combinedRuntime.dispose()]);
	});

	it('preserves emptyState, api, and runtime behaviour with right identity', async () => {
		const baseline = createValueSystem();
		const combined = combine(createValueSystem(), identityModule());

		expect(combined.emptyState()).toEqual(baseline.emptyState());
		expect(moduleApiKeys(combined)).toEqual(moduleApiKeys(baseline));

		const [baselineRuntime, combinedRuntime] = await Promise.all([
			createRuntime(baseline, { value: 3 }, [
				(api) => {
					api.registerValue(9);
				},
			]),
			createRuntime(combined, { value: 3 }, [
				(api) => {
					api.registerValue(9);
				},
			]),
		]);

		expect(combinedRuntime.label).toBe(baselineRuntime.label);
		expect(combinedRuntime.currentValue()).toBe(baselineRuntime.currentValue());
		await expect(combined.state(combinedRuntime).get()).resolves.toEqual(
			await baseline.state(baselineRuntime).get(),
		);

		await Promise.all([baselineRuntime.dispose(), combinedRuntime.dispose()]);
	});
});
