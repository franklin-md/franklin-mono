import { describe, expect, it, vi } from 'vitest';
import type { Signature } from '@franklin/extensibility';
import type { Extension } from '@franklin/extensibility';
import type { RegistryView } from '@franklin/extensibility';
import type { ExtensionPoint } from '@franklin/extensibility';
import type { BaseRuntime, StateHandle } from '@franklin/extensibility';
import { createDependencyModule } from '@franklin/extensibility/module';
import type { InferAPI, StateExtensionModule } from '../../state/index.js';
import { createOrchestrator, type OrchestratorModule } from '../index.js';

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

interface RuntimeAwareSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: RuntimeAwareAPISurface<this['In']>;
}

const runtimeAwareExtensionPoint: ExtensionPoint<RuntimeAwareSignature> = (
	writer,
) => ({
	onRuntime(handler) {
		writer({ name: 'onRuntime', value: [handler] });
	},
});

type TestModule = StateExtensionModule<
	TestState,
	RuntimeAwareSignature,
	TestRuntime
>;
type TestOrchestratedAPI = InferAPI<OrchestratorModule<[TestModule]>>;
type Settings = {
	get(): string;
};

function createTestModule(empty: TestState = { value: 'root' }): TestModule {
	return {
		emptyState: () => empty,
		state: (runtime) => runtime[TEST_STATE],
		instantiate(state) {
			const ownState: TestState = { value: state.value };
			return {
				extensionPoint: runtimeAwareExtensionPoint,
				compiler: {
					async compile<ContextRuntime extends BaseRuntime>(
						registry: RegistryView<RuntimeAwareSignature, ContextRuntime>,
						getRuntime: () => ContextRuntime,
					) {
						const handlers = registry
							.argsFor('onRuntime')
							.map(([handler]) => handler as RuntimeHandler<BaseRuntime>);
						let disposed = false;
						return {
							runHandlers() {
								for (const handler of handlers) handler(getRuntime());
							},
							wasDisposed() {
								return disposed;
							},
							[TEST_STATE]: {
								get: vi.fn(async () => ownState),
								fork: vi.fn(async () => ownState),
								child: vi.fn(async () => ({
									value: `child-of-${ownState.value}`,
								})),
							},
							dispose: vi.fn(async () => {
								disposed = true;
							}),
						};
					},
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
	it('creates a runtime with details and stores it in the collection', async () => {
		const orchestrator = createOrchestrator({
			modules: [createTestModule()] as const,
			extensions: [],
			createId: createIds('root-id'),
		});

		const entry = await orchestrator.create();

		expect(entry.details).toEqual({
			id: 'root-id',
			visibility: 'visible',
		});
		expect(entry.runtime.details).toEqual({
			id: 'root-id',
			visibility: 'visible',
		});
		expect(await entry.runtime[TEST_STATE].get()).toEqual({ value: 'root' });
		expect(orchestrator.get('root-id')?.runtime).toBe(entry.runtime);
		expect(orchestrator.list()).toEqual([entry]);
		expect(await orchestrator.getState('root-id')).toEqual({
			value: 'root',
			details: { visibility: 'visible' },
		});
		expect('materialize' in entry.runtime.orchestrator).toBe(false);
		// @ts-expect-error restore-only materialization is not runtime-facing
		void entry.runtime.orchestrator.materialize;
	});

	it('creates a restored runtime with the supplied id and state', async () => {
		const orchestrator = createOrchestrator({
			modules: [createTestModule()] as const,
			extensions: [],
		});

		const entry = await orchestrator.create({
			id: 'restored-id',
			state: {
				value: 'restored',
				details: { visibility: 'hidden' },
			},
		});

		expect(entry.details).toEqual({
			id: 'restored-id',
			visibility: 'hidden',
		});
		expect(entry.runtime.details).toEqual({
			id: 'restored-id',
			visibility: 'hidden',
		});
		expect(await entry.runtime[TEST_STATE].get()).toEqual({
			value: 'restored',
		});
		expect(orchestrator.get('restored-id')?.runtime).toBe(entry.runtime);
	});

	it('rejects duplicate explicit ids', async () => {
		const orchestrator = createOrchestrator({
			modules: [createTestModule()] as const,
			extensions: [],
		});

		await orchestrator.create({ id: 'root-id' });

		await expect(orchestrator.create({ id: 'root-id' })).rejects.toThrow(
			'Runtime root-id already exists',
		);
	});

	it.todo('rejects concurrent duplicate explicit ids', async () => {
		const orchestrator = createOrchestrator({
			modules: [createTestModule()] as const,
			extensions: [],
		});

		const results = await Promise.allSettled([
			orchestrator.create({ id: 'root-id' }),
			orchestrator.create({ id: 'root-id' }),
		]);

		expect(
			results.filter((result) => result.status === 'fulfilled'),
		).toHaveLength(1);
		expect(
			results.filter((result) => result.status === 'rejected'),
		).toHaveLength(1);
		expect(orchestrator.list()).toHaveLength(1);
	});

	it('injects a final-runtime orchestrator port into runtime-aware handlers', async () => {
		const seen: string[] = [];
		const extension: Extension<TestOrchestratedAPI> = (api) => {
			api.onRuntime((runtime) => {
				seen.push(runtime.details.id);
				seen.push(runtime.orchestrator.list()[0]!.runtime.details.id);
			});
		};
		const orchestrator = createOrchestrator({
			modules: [createTestModule()] as const,
			extensions: [extension],
			createId: createIds('root-id'),
		});

		const entry = await orchestrator.create();
		entry.runtime.runHandlers();

		expect(seen).toEqual(['root-id', 'root-id']);
	});

	it('lifts simple modules passed to createOrchestrator', async () => {
		const settings: Settings = { get: vi.fn(() => 'strict') };
		const settingsModule = createDependencyModule('settings', settings);
		type MixedModule = OrchestratorModule<[TestModule, typeof settingsModule]>;
		type MixedAPI = InferAPI<MixedModule>;
		const seen: string[] = [];
		const extension: Extension<MixedAPI> = (api) => {
			api.onRuntime((runtime) => {
				seen.push(runtime.settings.get());
				seen.push(runtime.details.id);
			});
		};
		const orchestrator = createOrchestrator({
			modules: [createTestModule(), settingsModule] as const,
			extensions: [extension],
			createId: createIds('root-id'),
		});

		const entry = await orchestrator.create();
		entry.runtime.runHandlers();

		expect(seen).toEqual(['strict', 'root-id']);
		expect(await entry.runtime[TEST_STATE].get()).toEqual({ value: 'root' });
	});

	it('creates child and fork runtimes from source state', async () => {
		const orchestrator = createOrchestrator({
			modules: [createTestModule({ value: 'source' })] as const,
			extensions: [],
			createId: createIds('source-id', 'child-id', 'fork-id'),
		});

		const source = await orchestrator.create({
			state: { details: { visibility: 'hidden' } },
		});
		const child = await source.runtime.orchestrator.create({
			from: source.runtime.details.id,
			mode: 'child',
		});
		const fork = await source.runtime.orchestrator.create({
			from: source.runtime.details.id,
			mode: 'fork',
		});

		expect(
			await orchestrator.get(child.details.id)!.runtime[TEST_STATE].get(),
		).toEqual({
			value: 'child-of-source',
		});
		expect(
			await orchestrator.get(fork.details.id)!.runtime[TEST_STATE].get(),
		).toEqual({
			value: 'source',
		});
		expect(child.runtime.details.visibility).toBe('hidden');
		expect(fork.runtime.details.visibility).toBe('hidden');
	});

	it('applies typed state patch on orchestrator-level create', async () => {
		const orchestrator = createOrchestrator({
			modules: [createTestModule()] as const,
			extensions: [],
			createId: createIds('root-id'),
		});

		const entry = await orchestrator.create({
			state: { value: 'override' },
		});

		expect(await entry.runtime[TEST_STATE].get()).toEqual({
			value: 'override',
		});
	});

	it('removes and disposes runtimes through the injected port', async () => {
		const orchestrator = createOrchestrator({
			modules: [createTestModule()] as const,
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
