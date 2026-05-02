import { describe, expect, it, vi } from 'vitest';
import type { API, BoundAPI } from '../../../algebra/api/index.js';
import type { Compiler } from '../../../algebra/compiler/index.js';
import type { Extension } from '../../../algebra/extension/index.js';
import type {
	BaseRuntime,
	StateHandle,
} from '../../../algebra/runtime/index.js';
import type {
	HarnessModule,
	InferBoundAPI,
	InferRuntime,
} from '../../modules/index.js';
import {
	createOrchestrator,
	RuntimeCollection,
	type OrchestratorModule,
} from '../index.js';

type TestState = {
	readonly value: string;
};

const TEST_STATE: unique symbol = Symbol('test/orchestrator-state');

type TestRuntime = BaseRuntime & {
	runHandlers(): void;
	wasDisposed(): boolean;
	readonly [TEST_STATE]: StateHandle<TestState>;
};

type RuntimeHandler<Runtime extends BaseRuntime> = (runtime: Runtime) => void;

type RuntimeAwareAPISurface<Runtime extends BaseRuntime> = {
	onRuntime(handler: RuntimeHandler<Runtime>): void;
};

interface RuntimeAwareAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: RuntimeAwareAPISurface<this['In']>;
}

type TestModule = HarnessModule<TestState, RuntimeAwareAPI, TestRuntime>;
type TestOrchestratedRuntime = InferRuntime<OrchestratorModule<[TestModule]>>;
type TestOrchestratedAPI = InferBoundAPI<OrchestratorModule<[TestModule]>>;

function createTestModule(empty: TestState = { value: 'root' }): TestModule {
	return {
		emptyState: () => empty,
		state: (runtime) => runtime[TEST_STATE],
		createCompiler(state): Compiler<RuntimeAwareAPI, TestRuntime> {
			const handlers: RuntimeHandler<BaseRuntime>[] = [];

			return {
				createApi: <ContextRuntime extends BaseRuntime>() =>
					({
						onRuntime(handler: RuntimeHandler<ContextRuntime>) {
							handlers.push(handler as RuntimeHandler<BaseRuntime>);
						},
					}) as BoundAPI<RuntimeAwareAPI, ContextRuntime>,
				async build(getRuntime: () => BaseRuntime) {
					let disposed = false;
					return {
						runHandlers() {
							for (const handler of handlers) handler(getRuntime());
						},
						wasDisposed() {
							return disposed;
						},
						[TEST_STATE]: {
							get: vi.fn(async () => state),
							fork: vi.fn(async () => state),
							child: vi.fn(async () => ({
								value: `child-of-${state.value}`,
							})),
						},
						dispose: vi.fn(async () => {
							disposed = true;
						}),
						subscribe: vi.fn(() => () => {}),
					};
				},
			};
		},
	};
}

function createIds(...ids: string[]) {
	let index = 0;
	return () => ids[index++] ?? `id-${index}`;
}

describe('Orchestrator', () => {
	it('creates a runtime with self id and stores it in the collection', async () => {
		const collection = new RuntimeCollection<TestOrchestratedRuntime>();
		const orchestrator = createOrchestrator({
			modules: [createTestModule()] as const,
			collection,
			extensions: [],
			createId: createIds('root-id'),
		});

		const entry = await orchestrator.create();

		expect(entry.id).toBe('root-id');
		expect(entry.runtime.self.id).toBe('root-id');
		expect(await entry.runtime[TEST_STATE].get()).toEqual({ value: 'root' });
		expect(collection.get('root-id')?.runtime).toBe(entry.runtime);
		expect(orchestrator.list()).toEqual([entry]);
	});

	it('materializes a restored runtime with the supplied id and state', async () => {
		const collection = new RuntimeCollection<TestOrchestratedRuntime>();
		const orchestrator = createOrchestrator({
			modules: [createTestModule()] as const,
			collection,
			extensions: [],
		});

		const entry = await orchestrator.materialize('restored-id', {
			value: 'restored',
		});

		expect(entry.id).toBe('restored-id');
		expect(entry.runtime.self.id).toBe('restored-id');
		expect(await entry.runtime[TEST_STATE].get()).toEqual({
			value: 'restored',
		});
		expect(collection.get('restored-id')?.runtime).toBe(entry.runtime);
	});

	it('injects a final-runtime orchestrator port into runtime-aware handlers', async () => {
		const collection = new RuntimeCollection<TestOrchestratedRuntime>();
		const seen: string[] = [];
		const extension: Extension<TestOrchestratedAPI> = (api) => {
			api.onRuntime((runtime) => {
				seen.push(runtime.self.id);
				seen.push(runtime.orchestrator.list()[0]!.runtime.self.id);
			});
		};
		const orchestrator = createOrchestrator({
			modules: [createTestModule()] as const,
			collection,
			extensions: [extension],
			createId: createIds('root-id'),
		});

		const entry = await orchestrator.create();
		entry.runtime.runHandlers();

		expect(seen).toEqual(['root-id', 'root-id']);
	});

	it('creates child and fork runtimes from source state', async () => {
		const collection = new RuntimeCollection<TestOrchestratedRuntime>();
		const orchestrator = createOrchestrator({
			modules: [createTestModule({ value: 'source' })] as const,
			collection,
			extensions: [],
			createId: createIds('source-id', 'child-id', 'fork-id'),
		});

		const source = await orchestrator.create();
		const child = await source.runtime.orchestrator.create({
			from: source.runtime.self.id,
			mode: 'child',
		});
		const fork = await source.runtime.orchestrator.create({
			from: source.runtime.self.id,
			mode: 'fork',
		});

		expect(await orchestrator.get(child.id)!.runtime[TEST_STATE].get()).toEqual(
			{
				value: 'child-of-source',
			},
		);
		expect(await orchestrator.get(fork.id)!.runtime[TEST_STATE].get()).toEqual({
			value: 'source',
		});
	});

	it('applies typed state overrides on orchestrator-level create', async () => {
		const collection = new RuntimeCollection<TestOrchestratedRuntime>();
		const orchestrator = createOrchestrator({
			modules: [createTestModule()] as const,
			collection,
			extensions: [],
			createId: createIds('root-id'),
		});

		const entry = await orchestrator.create({
			overrides: { value: 'override' },
		});

		expect(await entry.runtime[TEST_STATE].get()).toEqual({
			value: 'override',
		});
	});

	it('removes and disposes runtimes through the injected port', async () => {
		const collection = new RuntimeCollection<TestOrchestratedRuntime>();
		const orchestrator = createOrchestrator({
			modules: [createTestModule()] as const,
			collection,
			extensions: [],
			createId: createIds('root-id'),
		});
		const entry = await orchestrator.create();

		await expect(entry.runtime.orchestrator.remove('root-id')).resolves.toBe(
			true,
		);

		expect(orchestrator.get('root-id')).toBeUndefined();
		expect(entry.runtime.wasDisposed()).toBe(true);
	});
});
