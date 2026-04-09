import { describe, it, expect, vi } from 'vitest';
import { createSessionSystem } from '../session.js';
import { createRuntime } from '../create.js';
import { freshSessionState } from '../../state/session.js';
import type { SessionRuntime } from '../../runtime/session/runtime.js';
import type { SessionTree } from '../../runtime/session/tree.js';
import type { RuntimeBase } from '../../runtime/types.js';
import type { MergedRuntime } from '../../runtime/combine.js';
import type { SessionState } from '../../state/session.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockTree() {
	return {
		get: vi.fn((_id: string) => undefined),
		emptyState: vi.fn(() => freshSessionState()),
		add: vi.fn(async (state: SessionState) => ({
			id: state.session.id,
			runtime: createMockRuntime(state.session.id),
		})),
		create: vi.fn(async () => ({
			id: 'new-session',
			runtime: createMockRuntime('new-session'),
		})),
		spawn: vi.fn(async (_parentId: string) => ({
			id: 'child-spawned',
			runtime: createMockRuntime('child-spawned'),
		})),
		fork: vi.fn(async (_id: string) => ({
			id: 'forked',
			runtime: createMockRuntime('forked'),
		})),
		remove: vi.fn(async (_id: string) => {}),
		list: vi.fn(() => []),
	} as unknown as SessionTree<SessionState, SessionRuntime>;
}

function createMockRuntime(id: string): SessionRuntime {
	return {
		session: {
			child: vi.fn(async () => createMockRuntime('child-of-' + id)),
			fork: vi.fn(async () => createMockRuntime('fork-of-' + id)),
		},
		state: vi.fn(async () => ({ session: { id } })),
		fork: vi.fn(async () => ({ session: { id } })),
		child: vi.fn(async () => freshSessionState()),
		dispose: vi.fn(async () => {}),
		subscribe: vi.fn(() => () => {}),
	};
}

// ---------------------------------------------------------------------------
// freshSessionState
// ---------------------------------------------------------------------------

describe('freshSessionState', () => {
	it('generates a unique id each call', () => {
		const s1 = freshSessionState();
		const s2 = freshSessionState();

		expect(s1.session.id).toBeTruthy();
		expect(s2.session.id).toBeTruthy();
		expect(s1.session.id).not.toBe(s2.session.id);
	});
});

// ---------------------------------------------------------------------------
// createSessionSystem
// ---------------------------------------------------------------------------

describe('createSessionSystem', () => {
	it('emptyState returns a fresh state with random id', () => {
		const system = createSessionSystem(mockTree());
		const s1 = system.emptyState();
		const s2 = system.emptyState();

		expect(s1.session.id).toBeTruthy();
		expect(s1.session.id).not.toBe(s2.session.id);
	});

	it('create returns a runtime with session.child and session.fork', async () => {
		const tree = mockTree();
		const system = createSessionSystem(tree);

		const runtime = await createRuntime(
			system,
			{ session: { id: 'sess-1' } },
			[],
		);

		expect(runtime.session).toBeDefined();
		expect(runtime.session.child).toBeTypeOf('function');
		expect(runtime.session.fork).toBeTypeOf('function');
	});

	it('extensions access the runtime via getSession', async () => {
		const system = createSessionSystem(mockTree());

		let received: SessionRuntime | undefined;
		await createRuntime(system, { session: { id: 'sess-1' } }, [
			(api) => {
				received = api.getSession();
			},
		]);

		expect(received).toBeDefined();
		expect(received!.session.child).toBeTypeOf('function');
		expect(received!.session.fork).toBeTypeOf('function');
		// The runtime IS the handle — it has lifecycle methods too
		expect(received!.state).toBeTypeOf('function');
		expect(received!.dispose).toBeTypeOf('function');
	});

	it('session.child delegates to tree.spawn with id', async () => {
		const tree = mockTree();
		const system = createSessionSystem(tree);

		const runtime = await createRuntime(
			system,
			{ session: { id: 'parent-1' } },
			[],
		);

		await runtime.session.child();

		expect(tree.child).toHaveBeenCalledWith('parent-1');
	});

	it('state returns the session state', async () => {
		const system = createSessionSystem(mockTree());

		const runtime = await createRuntime(
			system,
			{ session: { id: 'sess-1' } },
			[],
		);

		expect(await runtime.state()).toEqual({
			session: { id: 'sess-1' },
		});
	});

	it('fork returns a fresh identity with random id', async () => {
		const system = createSessionSystem(mockTree());

		const runtime = await createRuntime(
			system,
			{ session: { id: 'sess-1' } },
			[],
		);

		const forkState = await runtime.fork();
		expect(forkState.session.id).toBeTruthy();
		expect(forkState.session.id).not.toBe('sess-1');
	});

	it('child returns a fresh identity with random id', async () => {
		const system = createSessionSystem(mockTree());

		const runtime = await createRuntime(
			system,
			{ session: { id: 'sess-1' } },
			[],
		);

		const childState = await runtime.child();
		expect(childState.session.id).toBeTruthy();
		expect(childState.session.id).not.toBe('sess-1');
	});

	it('dispose is safe to call', async () => {
		const system = createSessionSystem(mockTree());

		const runtime = await createRuntime(
			system,
			{ session: { id: 'sess-1' } },
			[],
		);

		await expect(runtime.dispose()).resolves.toBeUndefined();
	});

	it('subscribe returns an unsubscribe function', async () => {
		const system = createSessionSystem(mockTree());

		const runtime = await createRuntime(
			system,
			{ session: { id: 'sess-1' } },
			[],
		);

		const unsub = runtime.subscribe(() => {});
		expect(unsub).toBeTypeOf('function');
		unsub();
	});
});

// ---------------------------------------------------------------------------
// Type-level: combined runtimes are subtypes of their parts
// ---------------------------------------------------------------------------

describe('SessionRuntime subtyping', () => {
	it('MergedRuntime with SessionRuntime is assignable to SessionRuntime', () => {
		// Compile-time check: a combined runtime preserves SessionRuntime subtyping
		type FakeState = { fake: { value: string } };
		type FakeRuntime = RuntimeBase<FakeState> & { doFake(): void };
		type Combined = MergedRuntime<
			SessionState,
			FakeState,
			SessionRuntime,
			FakeRuntime
		>;

		// This assignment must compile — Combined extends SessionRuntime
		const _check: SessionRuntime = {} as Combined;
		expect(_check).toBeDefined();
	});
});
