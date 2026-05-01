import { describe, expect, it, vi } from 'vitest';
import { SessionCollection } from '../runtime/collection.js';
import { createSessionManager } from '../runtime/manager.js';
import type { SessionRuntime } from '../runtime/runtime.js';
import type {
	BaseRuntime,
	StateHandle,
} from '../../../algebra/runtime/types.js';
import type { RuntimeSystem } from '../../../algebra/system/types.js';
import type { Compiler } from '../../../algebra/compiler/types.js';
import type { StaticAPI } from '../../../algebra/api/types.js';

type TestState = {
	value: string;
};

const TEST_STATE: unique symbol = Symbol('test/sessions-state');

type TestRuntime = BaseRuntime & {
	readonly [TEST_STATE]: StateHandle<TestState>;
};
type TestSystem = RuntimeSystem<
	TestState,
	StaticAPI<Record<string, never>>,
	TestRuntime
>;

function createTestSystem(empty: TestState = { value: 'root' }): TestSystem {
	return {
		emptyState: () => empty,
		state: (runtime) => runtime[TEST_STATE],
		createCompiler(state): Compiler<Record<string, never>, TestRuntime> {
			return {
				api: {},
				async build() {
					return {
						[TEST_STATE]: {
							get: vi.fn(async () => state),
							fork: vi.fn(async () => state),
							child: vi.fn(async () => ({
								value: 'child-of-' + state.value,
							})),
						},
						dispose: vi.fn(async () => {}),
						subscribe: vi.fn(() => () => {}),
					};
				},
			};
		},
	};
}

type TestSessionRuntime = SessionRuntime<TestSystem>;

function createManagerAndCollection(empty?: TestState) {
	const collection = new SessionCollection<TestSessionRuntime>();
	const system = createTestSystem(empty);
	const manager = createSessionManager({ system, collection, extensions: [] });
	return { manager, collection, system };
}

describe('SessionManager', () => {
	it('creates a root session from emptyState', async () => {
		const { manager, collection, system } = createManagerAndCollection();

		const session = await manager.create();

		expect(await system.state(session.runtime).get()).toEqual({
			value: 'root',
		});
		expect(collection.list()).toHaveLength(1);
		expect(collection.list()[0]!.id).toBe(session.id);
		expect(collection.list()[0]!.runtime).toBe(session.runtime);
	});

	it('assigns a unique id to each session', async () => {
		const { manager, collection } = createManagerAndCollection();

		await manager.create();
		await manager.create();

		const sessions = collection.list();
		expect(sessions).toHaveLength(2);
		expect(sessions[0]!.id).not.toBe(sessions[1]!.id);
	});

	it('removeSelf removes the current session from the collection', async () => {
		const { manager, collection } = createManagerAndCollection();

		const session = await manager.create();

		expect(collection.has(session.id)).toBe(true);
		await expect(session.runtime.session.removeSelf()).resolves.toBe(true);
		expect(collection.has(session.id)).toBe(false);
		await expect(session.runtime.session.removeSelf()).resolves.toBe(false);
	});

	it('creates a child session by deriving state from parent', async () => {
		const { manager, collection, system } = createManagerAndCollection();

		await manager.create();
		const parentId = collection.list()[0]!.id;

		const child = await manager.create({ from: parentId, mode: 'child' });

		expect(await system.state(child.runtime).get()).toEqual(
			expect.objectContaining({ value: 'child-of-root' }),
		);
		expect(collection.list()).toHaveLength(2);
	});

	it('creates a fork session by deriving state from source', async () => {
		const { manager, collection, system } = createManagerAndCollection({
			value: 'source',
		});

		await manager.create();
		const sourceId = collection.list()[0]!.id;

		const forked = await manager.create({ from: sourceId, mode: 'fork' });

		expect(await system.state(forked.runtime).get()).toEqual(
			expect.objectContaining({ value: 'source' }),
		);
	});

	it('throws when source session is not found', async () => {
		const { manager } = createManagerAndCollection();

		await expect(
			manager.create({ from: 'missing', mode: 'child' }),
		).rejects.toThrow('Session missing not found');
	});

	it('defaults to child mode when from is specified without mode', async () => {
		const { manager, collection, system } = createManagerAndCollection();

		await manager.create();
		const parentId = collection.list()[0]!.id;

		const derived = await manager.create({ from: parentId });

		expect(await system.state(derived.runtime).get()).toEqual(
			expect.objectContaining({ value: 'child-of-root' }),
		);
	});

	it('applies state overrides to root sessions', async () => {
		const { manager, system } = createManagerAndCollection();

		const session = await manager.create({
			overrides: { value: 'overridden' },
		});

		expect(await system.state(session.runtime).get()).toEqual(
			expect.objectContaining({ value: 'overridden' }),
		);
	});

	it('applies state overrides to derived sessions', async () => {
		const { manager, collection, system } = createManagerAndCollection();

		await manager.create();
		const parentId = collection.list()[0]!.id;

		const child = await manager.create({
			from: parentId,
			mode: 'child',
			overrides: { value: 'child-override' },
		});

		expect(await system.state(child.runtime).get()).toEqual(
			expect.objectContaining({ value: 'child-override' }),
		);
	});

	it('deeply merges nested overrides', async () => {
		type NestedState = {
			value: string;
			nested: {
				keep: string;
				change: string;
			};
		};
		const NESTED_STATE: unique symbol = Symbol('test/nested-state');
		type NestedRuntime = BaseRuntime & {
			readonly [NESTED_STATE]: StateHandle<NestedState>;
		};
		type NestedSystem = RuntimeSystem<
			NestedState,
			StaticAPI<Record<string, never>>,
			NestedRuntime
		>;

		const system: NestedSystem = {
			emptyState: () => ({
				value: 'root',
				nested: {
					keep: 'keep',
					change: 'base',
				},
			}),
			state: (runtime) => runtime[NESTED_STATE],
			createCompiler(state): Compiler<Record<string, never>, NestedRuntime> {
				return {
					api: {},
					async build() {
						return {
							[NESTED_STATE]: {
								get: vi.fn(async () => state),
								fork: vi.fn(async () => state),
								child: vi.fn(async () => state),
							},
							dispose: vi.fn(async () => {}),
							subscribe: vi.fn(() => () => {}),
						};
					},
				};
			},
		};
		const collection = new SessionCollection<SessionRuntime<NestedSystem>>();
		const manager = createSessionManager({
			system,
			collection,
			extensions: [],
		});

		const session = await manager.create({
			overrides: { nested: { change: 'override' } },
		});

		expect(await system.state(session.runtime).get()).toEqual({
			value: 'root',
			nested: {
				keep: 'keep',
				change: 'override',
			},
		});
	});
});
