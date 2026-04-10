import { describe, it, expect, vi } from 'vitest';
import { createSessionSystem } from '../session.js';
import { createRuntime } from '../create.js';
import { SessionCollection } from '../../runtime/session/collection.js';
import { createSessionManager } from '../../runtime/session/manager.js';
import type { SessionRuntime } from '../../runtime/session/runtime.js';
import type { RuntimeBase } from '../../runtime/types.js';
import type { MergedRuntime } from '../../runtime/combine.js';
import type { EmptyState } from '../../state/empty.js';
import type { RuntimeSystem } from '../types.js';
import type { Compiler } from '../../compile/types.js';
import type { SessionCreate } from '../../runtime/session/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TestState = { value: string };
type TestRuntime = RuntimeBase<TestState>;
type TestSystem = RuntimeSystem<TestState, Record<string, never>, TestRuntime>;

function createTestSystem(): TestSystem {
	return {
		emptyState: () => ({ value: 'root' }),
		async createCompiler(
			state: TestState,
		): Promise<Compiler<Record<string, never>, TestRuntime>> {
			return {
				api: {},
				async build(): Promise<TestRuntime> {
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

// ---------------------------------------------------------------------------
// createSessionSystem
// ---------------------------------------------------------------------------

describe('createSessionSystem', () => {
	it('emptyState delegates to the base system', () => {
		const { manager } = createTestManager();
		const system = createTestSystem();
		const sessionSystem = createSessionSystem(
			system,
			'test-id',
			manager.create,
		);

		const state = sessionSystem.emptyState();
		expect(state).toEqual({ value: 'root' });
	});

	it('builds a runtime with session.child and session.fork', async () => {
		const { manager } = createTestManager();
		const system = createTestSystem();
		const sessionSystem = createSessionSystem(
			system,
			'test-id',
			manager.create,
		);

		const runtime = await createRuntime(sessionSystem, { value: 'test' }, []);

		expect(runtime.session).toBeDefined();
		expect(runtime.session.child).toBeTypeOf('function');
		expect(runtime.session.fork).toBeTypeOf('function');
	});

	it('extensions access session via api.session', async () => {
		const { manager } = createTestManager();
		const system = createTestSystem();
		const sessionSystem = createSessionSystem(
			system,
			'test-id',
			manager.create,
		);

		let receivedChild: (() => Promise<unknown>) | undefined;
		let receivedFork: (() => Promise<unknown>) | undefined;

		await createRuntime(sessionSystem, { value: 'test' }, [
			(api) => {
				receivedChild = api.session.createChild;
				receivedFork = api.session.createFork;
			},
		]);

		expect(receivedChild).toBeTypeOf('function');
		expect(receivedFork).toBeTypeOf('function');
	});

	it('preserves base runtime methods', async () => {
		const { manager } = createTestManager();
		const system = createTestSystem();
		const sessionSystem = createSessionSystem(
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
		const sessionSystem = createSessionSystem(
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
		const sessionSystem = createSessionSystem(
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
		const createSpy = vi.fn<SessionCreate<TestSystem>>().mockResolvedValue({
			id: 'child-id',
			runtime: {} as TestSessionRuntime,
		});
		const sessionSystem = createSessionSystem(system, 'test-id', createSpy);
		const runtime = await createRuntime(sessionSystem, { value: 'test' }, []);
		await runtime.session.child();

		expect(createSpy).toHaveBeenCalledWith({ from: 'test-id', mode: 'child' });
	});

	it('session.fork delegates to the create function', async () => {
		const system = createTestSystem();
		const createSpy = vi.fn<SessionCreate<TestSystem>>().mockResolvedValue({
			id: 'fork-id',
			runtime: {} as TestSessionRuntime,
		});
		const sessionSystem = createSessionSystem(system, 'test-id', createSpy);
		const runtime = await createRuntime(sessionSystem, { value: 'test' }, []);
		await runtime.session.fork();

		expect(createSpy).toHaveBeenCalledWith({ from: 'test-id', mode: 'fork' });
	});
});

// ---------------------------------------------------------------------------
// Type-level: combined runtimes preserve SessionRuntime subtyping
// ---------------------------------------------------------------------------

describe('SessionRuntime subtyping', () => {
	it('MergedRuntime with SessionRuntime is assignable to SessionRuntime', () => {
		type MinimalSystem = RuntimeSystem<
			EmptyState,
			Record<never, never>,
			RuntimeBase<EmptyState>
		>;
		type FakeState = { fake: { value: string } };
		type FakeRuntime = RuntimeBase<FakeState> & { doFake(): void };
		type Combined = MergedRuntime<
			EmptyState,
			FakeState,
			SessionRuntime<MinimalSystem>,
			FakeRuntime
		>;

		// This assignment must compile — Combined extends SessionRuntime
		const _check: SessionRuntime<MinimalSystem> = {} as Combined;
		expect(_check).toBeDefined();
	});
});
