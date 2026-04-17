import { describe, it, expect, vi } from 'vitest';
import { withSetup } from '../setup.js';
import type { RuntimeSystem } from '../types.js';
import type { BaseRuntime } from '../../runtime/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TestState = { value: number };
type TestAPI = { register(n: number): void };
type TestRuntime = BaseRuntime<TestState> & { getValue(): number };

function createTestSystem(): RuntimeSystem<TestState, TestAPI, TestRuntime> {
	return {
		emptyState: () => ({ value: 0 }),
		async createCompiler(state: TestState) {
			let registered = state.value;
			return {
				api: {
					register(n: number) {
						registered = n;
					},
				},
				async build(): Promise<TestRuntime> {
					const val = registered;
					return {
						getValue: () => val,
						state: async () => ({ value: val }),
						fork: async () => ({ value: val }),
						child: async () => ({ value: 0 }),
						dispose: async () => {},
						subscribe: () => () => {},
					};
				},
			};
		},
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('withSetup', () => {
	it('runs setup callback after build', async () => {
		const system = createTestSystem();
		const order: string[] = [];

		const decorated = withSetup(system, async () => {
			order.push('setup');
		});

		const compiler = await decorated.createCompiler({ value: 42 });

		order.push('before-build');
		await compiler.build();
		order.push('after-build');

		expect(order).toEqual(['before-build', 'setup', 'after-build']);
	});

	it('passes the built runtime to setup', async () => {
		const system = createTestSystem();
		let captured: TestRuntime | undefined;

		const decorated = withSetup(system, async (runtime) => {
			captured = runtime;
		});

		const compiler = await decorated.createCompiler({ value: 7 });
		const runtime = await compiler.build();

		expect(captured).toBe(runtime);
		expect(captured!.getValue()).toBe(7);
	});

	it('passes the state to setup', async () => {
		const system = createTestSystem();
		let capturedState: TestState | undefined;

		const decorated = withSetup(system, async (_runtime, state) => {
			capturedState = state;
		});

		const compiler = await decorated.createCompiler({ value: 99 });
		await compiler.build();

		expect(capturedState).toEqual({ value: 99 });
	});

	it('preserves emptyState', () => {
		const system = createTestSystem();
		const decorated = withSetup(system, async () => {});

		expect(decorated.emptyState()).toEqual({ value: 0 });
	});

	it('preserves the compiler API', async () => {
		const system = createTestSystem();
		const decorated = withSetup(system, async () => {});

		const compiler = await decorated.createCompiler({ value: 0 });
		compiler.api.register(42);
		const runtime = await compiler.build();

		expect(runtime.getValue()).toBe(42);
	});

	it('setup can mutate the runtime', async () => {
		const system = createTestSystem();
		const setupSpy = vi.fn();

		const decorated = withSetup(system, async (runtime) => {
			// Simulate a side effect like setContext — verify it's called
			setupSpy(runtime.getValue());
		});

		const compiler = await decorated.createCompiler({ value: 5 });
		await compiler.build();

		expect(setupSpy).toHaveBeenCalledWith(5);
	});
});
