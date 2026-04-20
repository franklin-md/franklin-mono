import { describe, it, expect, vi } from 'vitest';
import { createSessionSystem, type SessionSystem } from '../system.js';
import { createRuntime } from '../../../algebra/system/create.js';
import { SessionCollection } from '../runtime/collection.js';
import { createSessionManager } from '../runtime/manager.js';
import type { SessionRuntime } from '../runtime/runtime.js';
import type { BaseRuntime } from '../../../algebra/runtime/types.js';
import type { CombinedRuntime } from '../../../algebra/runtime/combine.js';
import type { IdentityState } from '../../identity/state.js';
import type { RuntimeSystem } from '../../../algebra/system/types.js';
import type { Compiler } from '../../../algebra/compiler/types.js';
import type { SessionCreate } from '../runtime/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TestState = { value: string };
type TestRuntime = BaseRuntime<TestState>;
type TestSystem = RuntimeSystem<TestState, Record<string, never>, TestRuntime>;

function createTestSystem(): TestSystem {
	return {
		emptyState: () => ({ value: 'root' }),
		createCompiler(): Compiler<Record<string, never>, TestState, TestRuntime> {
			return {
				api: {},
				async build(state) {
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
}

type TestSessionRuntime = SessionRuntime<TestSystem>;

function createTestManager() {
	const collection = new SessionCollection<TestSessionRuntime>();
	const system = createTestSystem();
	return {
		manager: createSessionManager({ system, collection, extensions: [] }),
		collection,
	};
}

function createTestSessionSystem(
	system: TestSystem,
	id: string,
	create: SessionCreate<SessionSystem<TestSystem>>,
	remove: (id: string) => Promise<boolean> = vi.fn(async () => true),
) {
	return createSessionSystem(system, id, create, remove);
}

// ---------------------------------------------------------------------------
// createSessionSystem
// ---------------------------------------------------------------------------

describe('createSessionSystem', () => {
	it('emptyState delegates to the base system', () => {
		const { manager } = createTestManager();
		const system = createTestSystem();
		const sessionSystem = createTestSessionSystem(
			system,
			'test-id',
			manager.create,
		);

		const state = sessionSystem.emptyState();
		expect(state).toEqual({ value: 'root' });
	});

	it('builds a runtime with session.child, session.fork, and session.removeSelf', async () => {
		const { manager } = createTestManager();
		const system = createTestSystem();
		const sessionSystem = createTestSessionSystem(
			system,
			'test-id',
			manager.create,
		);

		const runtime = await createRuntime(sessionSystem, { value: 'test' }, []);

		expect(runtime.session).toBeDefined();
		expect(runtime.session.child).toBeTypeOf('function');
		expect(runtime.session.fork).toBeTypeOf('function');
		expect(runtime.session.removeSelf).toBeTypeOf('function');
	});

	it('does not expose session ops on the api surface (registration-time)', async () => {
		const { manager } = createTestManager();
		const system = createTestSystem();
		const sessionSystem = createTestSessionSystem(
			system,
			'test-id',
			manager.create,
		);

		// Session ops are stage-1 capabilities — they live on the runtime, not
		// on the registration api. Extensions reach them via ctx.runtime.session.*.
		await createRuntime(sessionSystem, { value: 'test' }, [
			(api) => {
				expect(
					(api as unknown as { session?: unknown }).session,
				).toBeUndefined();
			},
		]);
	});

	it('preserves base runtime methods', async () => {
		const { manager } = createTestManager();
		const system = createTestSystem();
		const sessionSystem = createTestSessionSystem(
			system,
			'test-id',
			manager.create,
		);

		const runtime = await createRuntime(sessionSystem, { value: 'test' }, []);

		expect(await runtime.state()).toEqual({ value: 'test' });
		expect(await runtime.fork()).toEqual({ value: 'test' });
		expect(await runtime.child()).toEqual({ value: 'test' });
	});

	it('dispose is safe to call', async () => {
		const { manager } = createTestManager();
		const system = createTestSystem();
		const sessionSystem = createTestSessionSystem(
			system,
			'test-id',
			manager.create,
		);

		const runtime = await createRuntime(sessionSystem, { value: 'test' }, []);

		await expect(runtime.dispose()).resolves.toBeUndefined();
	});

	it('subscribe returns an unsubscribe function', async () => {
		const { manager } = createTestManager();
		const system = createTestSystem();
		const sessionSystem = createTestSessionSystem(
			system,
			'test-id',
			manager.create,
		);

		const runtime = await createRuntime(sessionSystem, { value: 'test' }, []);

		const unsub = runtime.subscribe(() => {});
		expect(unsub).toBeTypeOf('function');
		unsub();
	});

	it('session.child delegates to the create function', async () => {
		const system = createTestSystem();
		const createSpy = vi
			.fn<SessionCreate<SessionSystem<TestSystem>>>()
			.mockResolvedValue({
				id: 'child-id',
				runtime: {} as TestSessionRuntime,
			});
		const sessionSystem = createTestSessionSystem(system, 'test-id', createSpy);
		const runtime = await createRuntime(sessionSystem, { value: 'test' }, []);
		await runtime.session.child();

		expect(createSpy).toHaveBeenCalledWith({ from: 'test-id', mode: 'child' });
	});

	it('session.fork delegates to the create function', async () => {
		const system = createTestSystem();
		const createSpy = vi
			.fn<SessionCreate<SessionSystem<TestSystem>>>()
			.mockResolvedValue({
				id: 'fork-id',
				runtime: {} as TestSessionRuntime,
			});
		const sessionSystem = createTestSessionSystem(system, 'test-id', createSpy);
		const runtime = await createRuntime(sessionSystem, { value: 'test' }, []);
		await runtime.session.fork();

		expect(createSpy).toHaveBeenCalledWith({ from: 'test-id', mode: 'fork' });
	});

	it('session.removeSelf delegates to the remove function', async () => {
		const system = createTestSystem();
		const createSpy = vi.fn<SessionCreate<SessionSystem<TestSystem>>>();
		const remove = vi.fn(async () => true);
		const sessionSystem = createTestSessionSystem(
			system,
			'test-id',
			createSpy,
			remove,
		);
		const runtime = await createRuntime(sessionSystem, { value: 'test' }, []);

		await expect(runtime.session.removeSelf()).resolves.toBe(true);

		expect(remove).toHaveBeenCalledWith('test-id');
	});
});

// ---------------------------------------------------------------------------
// Type-level: combined runtimes preserve SessionRuntime subtyping
// ---------------------------------------------------------------------------

describe('SessionRuntime subtyping', () => {
	it('CombinedRuntime with SessionRuntime is assignable to SessionRuntime', () => {
		type MinimalSystem = RuntimeSystem<
			IdentityState,
			Record<never, never>,
			BaseRuntime<IdentityState>
		>;
		type FakeState = { fake: { value: string } };
		type FakeRuntime = BaseRuntime<FakeState> & { doFake(): void };
		type Combined = CombinedRuntime<
			IdentityState,
			FakeState,
			SessionRuntime<MinimalSystem>,
			FakeRuntime
		>;

		// This assignment must compile — Combined extends SessionRuntime
		const _check: SessionRuntime<MinimalSystem> = {} as Combined;
		expect(_check).toBeDefined();
	});
});
