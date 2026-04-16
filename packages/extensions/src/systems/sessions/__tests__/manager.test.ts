import { describe, expect, it, vi } from 'vitest';
import { SessionCollection } from '../runtime/collection.js';
import { createSessionManager } from '../runtime/manager.js';
import type { SessionRuntime } from '../runtime/runtime.js';
import type { RuntimeBase } from '../../../algebra/runtime/types.js';
import type { RuntimeSystem } from '../../../algebra/system/types.js';
import type { Compiler } from '../../../algebra/compiler/types.js';

type TestState = {
	value: string;
};

type TestRuntime = RuntimeBase<TestState>;
type TestSystem = RuntimeSystem<TestState, Record<string, never>, TestRuntime>;

function createTestSystem(empty: TestState = { value: 'root' }): TestSystem {
	return {
		emptyState: () => empty,
		async createCompiler(
			state: TestState,
		): Promise<Compiler<Record<string, never>, TestRuntime>> {
			return {
				api: {},
				async build(): Promise<TestRuntime> {
					return {
						state: vi.fn(async () => state),
						fork: vi.fn(async () => state),
						child: vi.fn(async () => ({ value: 'child-of-' + state.value })),
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
	return { manager, collection };
}

describe('SessionManager', () => {
	it('creates a root session from emptyState', async () => {
		const { manager, collection } = createManagerAndCollection();

		const session = await manager.create();

		expect(await session.runtime.state()).toEqual({ value: 'root' });
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
		const { manager, collection } = createManagerAndCollection();

		await manager.create();
		const parentId = collection.list()[0]!.id;

		const child = await manager.create({ from: parentId, mode: 'child' });

		// child() on the merged runtime returns { value: 'child-of-root' }
		expect(await child.runtime.state()).toEqual(
			expect.objectContaining({ value: 'child-of-root' }),
		);
		expect(collection.list()).toHaveLength(2);
	});

	it('creates a fork session by deriving state from source', async () => {
		const { manager, collection } = createManagerAndCollection({
			value: 'source',
		});

		await manager.create();
		const sourceId = collection.list()[0]!.id;

		const forked = await manager.create({ from: sourceId, mode: 'fork' });

		// fork() returns the same state as the source
		expect(await forked.runtime.state()).toEqual(
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
		const { manager, collection } = createManagerAndCollection();

		await manager.create();
		const parentId = collection.list()[0]!.id;

		const derived = await manager.create({ from: parentId });

		// Default mode is child — should get child-derived state
		expect(await derived.runtime.state()).toEqual(
			expect.objectContaining({ value: 'child-of-root' }),
		);
	});

	it('applies state overrides to root sessions', async () => {
		const { manager } = createManagerAndCollection();

		const session = await manager.create({
			overrides: { value: 'overridden' },
		});

		expect(await session.runtime.state()).toEqual(
			expect.objectContaining({ value: 'overridden' }),
		);
	});

	it('applies state overrides to derived sessions', async () => {
		const { manager, collection } = createManagerAndCollection();

		await manager.create();
		const parentId = collection.list()[0]!.id;

		const child = await manager.create({
			from: parentId,
			mode: 'child',
			overrides: { value: 'child-override' },
		});

		expect(await child.runtime.state()).toEqual(
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
		type NestedRuntime = RuntimeBase<NestedState>;
		type NestedSystem = RuntimeSystem<
			NestedState,
			Record<string, never>,
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
			async createCompiler(
				state: NestedState,
			): Promise<Compiler<Record<string, never>, NestedRuntime>> {
				return {
					api: {},
					async build(): Promise<NestedRuntime> {
						return {
							state: vi.fn(async () => state),
							fork: vi.fn(async () => state),
							child: vi.fn(async () => state),
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

		expect(await session.runtime.state()).toEqual({
			value: 'root',
			nested: {
				keep: 'keep',
				change: 'override',
			},
		});
	});
});
