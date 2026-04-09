import { describe, expect, it, vi } from 'vitest';
import { SessionCollection } from '../../runtime/session/collection.js';
import { createSessionTree, SessionTree } from '../../runtime/session/tree.js';
import type { SessionRuntime } from '../../runtime/session/runtime.js';
import type { Compiler } from '../../compile/types.js';
import type { RuntimeBase } from '../../runtime/types.js';
import type { SessionState } from '../../state/session.js';
import type { RuntimeSystem } from '../types.js';

type TestState = SessionState & {
	value: string;
};

type TestAPI = {
	readonly label: 'test-api';
};

type TestRuntime = RuntimeBase<TestState> & SessionRuntime;

function createTestRuntime(
	state: TestState,
	options?: {
		childState?: TestState;
		forkState?: TestState;
	},
): TestRuntime {
	const runtime: TestRuntime = {
		session: {
			child: vi.fn(async () => runtime),
			fork: vi.fn(async () => runtime),
		},
		state: vi.fn(async () => state),
		fork: vi.fn(async () => options?.forkState ?? state),
		child: vi.fn(async () => options?.childState ?? state),
		dispose: vi.fn(async () => {}),
		subscribe: vi.fn(() => () => {}),
	};

	return runtime;
}

function createHarness(emptyState?: TestState) {
	const builtRuntimes = new Map<string, TestRuntime>();
	const empty = emptyState ?? {
		session: { id: 'session-created' },
		value: 'root',
	};

	const createCompiler = vi.fn(
		async (state: TestState): Promise<Compiler<TestAPI, TestRuntime>> => ({
			api: { label: 'test-api' },
			async build() {
				const runtime = createTestRuntime(state);
				builtRuntimes.set(state.session.id, runtime);
				return runtime;
			},
		}),
	);

	const system: RuntimeSystem<TestState, TestAPI, TestRuntime> = {
		emptyState: vi.fn(() => empty),
		createCompiler,
	};

	const spawn = vi.fn(async (state: TestState) => {
		const compiler = await createCompiler(state);
		return compiler.build();
	});

	return { system, spawn, builtRuntimes, createCompiler };
}

describe('SessionTree', () => {
	it('creates a session from emptyState and stores it in the collection', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const { system, spawn, builtRuntimes, createCompiler } = createHarness();
		const tree = new SessionTree({
			collection,
			emptyState: system.emptyState,
			spawn,
		});

		const runtime = await tree.create();

		expect(system.emptyState).toHaveBeenCalledOnce();
		expect(spawn).toHaveBeenCalledWith({
			session: { id: 'session-created' },
			value: 'root',
		});
		expect(createCompiler).toHaveBeenCalledWith({
			session: { id: 'session-created' },
			value: 'root',
		});
		expect(runtime).toBe(builtRuntimes.get('session-created'));
		expect(tree.get('session-created')).toBe(runtime);
	});

	it('delegates get and list to the collection', () => {
		const collection = new SessionCollection<TestRuntime>();
		const { system, spawn } = createHarness();
		const tree = new SessionTree({
			collection,
			emptyState: system.emptyState,
			spawn,
		});
		const runtime = createTestRuntime({
			session: { id: 'session-1' },
			value: 'value-1',
		});

		collection.set('session-1', runtime);

		expect(tree.get('session-1')).toBe(runtime);
		expect(tree.list()).toEqual(['session-1']);
	});

	it('spawns from a parent session and stores the child runtime', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const { system, spawn, builtRuntimes, createCompiler } = createHarness();
		const tree = new SessionTree({
			collection,
			emptyState: system.emptyState,
			spawn,
		});
		const childState: TestState = {
			session: { id: 'session-child' },
			value: 'child',
		};
		const parent = createTestRuntime(
			{ session: { id: 'session-parent' }, value: 'parent' },
			{ childState },
		);

		collection.set('session-parent', parent);

		const child = await tree.child('session-parent');

		expect(parent.child).toHaveBeenCalledOnce();
		expect(createCompiler).toHaveBeenCalledWith(childState);
		expect(child).toBe(builtRuntimes.get('session-child'));
		expect(collection.get('session-child')).toBe(child);
	});

	it('throws when spawning from a missing parent', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const { system, spawn } = createHarness();
		const tree = new SessionTree({
			collection,
			emptyState: system.emptyState,
			spawn,
		});

		await expect(tree.child('missing-parent')).rejects.toThrow(
			'Parent session missing-parent not found',
		);
	});

	it('forks an existing session and stores the forked runtime', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const { system, spawn, builtRuntimes, createCompiler } = createHarness();
		const tree = new SessionTree({
			collection,
			emptyState: system.emptyState,
			spawn,
		});
		const forkState: TestState = {
			session: { id: 'session-forked' },
			value: 'forked',
		};
		const runtime = createTestRuntime(
			{ session: { id: 'session-source' }, value: 'source' },
			{ forkState },
		);

		collection.set('session-source', runtime);

		const forked = await tree.fork('session-source');

		expect(runtime.fork).toHaveBeenCalledOnce();
		expect(createCompiler).toHaveBeenCalledWith(forkState);
		expect(forked).toBe(builtRuntimes.get('session-forked'));
		expect(collection.get('session-forked')).toBe(forked);
	});

	it('throws when forking a missing session', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const { system, spawn } = createHarness();
		const tree = new SessionTree({
			collection,
			emptyState: system.emptyState,
			spawn,
		});

		await expect(tree.fork('missing-session')).rejects.toThrow(
			'Session missing-session not found',
		);
	});

	it('disposes and removes an existing session', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const { system, spawn } = createHarness();
		const tree = new SessionTree({
			collection,
			emptyState: system.emptyState,
			spawn,
		});
		const runtime = createTestRuntime({
			session: { id: 'session-1' },
			value: 'value-1',
		});

		collection.set('session-1', runtime);
		await tree.remove('session-1');

		expect(runtime.dispose).toHaveBeenCalledOnce();
		expect(collection.has('session-1')).toBe(false);
	});

	it('is a no-op when removing a missing session', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const { system, spawn } = createHarness();
		const tree = new SessionTree({
			collection,
			emptyState: system.emptyState,
			spawn,
		});

		await expect(tree.remove('missing-session')).resolves.toBeUndefined();
		expect(collection.list()).toEqual([]);
	});
});

describe('createSessionTree', () => {
	it('wraps createRuntime with extensions and returns a SessionTree instance', async () => {
		const collection = new SessionCollection<TestRuntime>();
		const { system, builtRuntimes, createCompiler } = createHarness();
		const extension = vi.fn((_api: TestAPI) => {});
		const tree = createSessionTree(collection, system, [extension]);

		const runtime = await tree.create();

		expect(tree).toBeInstanceOf(SessionTree);
		expect(system.emptyState).toHaveBeenCalledOnce();
		expect(createCompiler).toHaveBeenCalledWith({
			session: { id: 'session-created' },
			value: 'root',
		});
		expect(extension).toHaveBeenCalledOnce();
		expect(runtime).toBe(builtRuntimes.get('session-created'));
		expect(tree.get('session-created')).toBe(runtime);
	});
});
