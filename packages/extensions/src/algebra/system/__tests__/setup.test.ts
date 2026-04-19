import { describe, it, expect, vi } from 'vitest';
import { withSetup, withSetupCompiler } from '../setup.js';
import type { RuntimeSystem } from '../types.js';
import type { BaseRuntime } from '../../runtime/types.js';
import type { Compiler } from '../../compiler/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TestState = { value: number };
type TestAPI = { register(n: number): void };
type TestRuntime = BaseRuntime<TestState> & { getValue(): number };

function createTestSystem(): RuntimeSystem<TestState, TestAPI, TestRuntime> {
	return {
		emptyState: () => ({ value: 0 }),
		createCompiler(): Compiler<TestAPI, TestState, TestRuntime> {
			let registered: number | undefined;
			return {
				api: {
					register(n: number) {
						registered = n;
					},
				},
				async build(state) {
					const val = registered ?? state.value;
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

const noGetRuntime = (): never => {
	throw new Error('getRuntime not used in this test');
};

// ---------------------------------------------------------------------------
// withSetup (system-level)
// ---------------------------------------------------------------------------

describe('withSetup', () => {
	it('runs setup callback after build', async () => {
		const system = createTestSystem();
		const order: string[] = [];

		const decorated = withSetup(system, async () => {
			order.push('setup');
		});

		const compiler = decorated.createCompiler();

		order.push('before-build');
		await compiler.build({ value: 42 }, noGetRuntime);
		order.push('after-build');

		expect(order).toEqual(['before-build', 'setup', 'after-build']);
	});

	it('passes the built runtime to setup', async () => {
		const system = createTestSystem();
		let captured: TestRuntime | undefined;

		const decorated = withSetup(system, async (runtime) => {
			captured = runtime;
		});

		const compiler = decorated.createCompiler();
		const built = await compiler.build({ value: 7 }, noGetRuntime);

		expect(captured).toBe(built);
		expect(captured!.getValue()).toBe(7);
	});

	it('passes the state to setup', async () => {
		const system = createTestSystem();
		let capturedState: TestState | undefined;

		const decorated = withSetup(system, async (_runtime, state) => {
			capturedState = state;
		});

		const compiler = decorated.createCompiler();
		await compiler.build({ value: 99 }, noGetRuntime);

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

		const compiler = decorated.createCompiler();
		compiler.api.register(42);
		const built = await compiler.build({ value: 0 }, noGetRuntime);

		expect(built.getValue()).toBe(42);
	});

	it('setup can observe the runtime', async () => {
		const system = createTestSystem();
		const setupSpy = vi.fn();

		const decorated = withSetup(system, async (runtime) => {
			setupSpy(runtime.getValue());
		});

		const compiler = decorated.createCompiler();
		await compiler.build({ value: 5 }, noGetRuntime);

		expect(setupSpy).toHaveBeenCalledWith(5);
	});
});

// ---------------------------------------------------------------------------
// withSetupCompiler (compiler-level)
// ---------------------------------------------------------------------------

describe('withSetupCompiler', () => {
	it('wraps build to run setup after inner build resolves', async () => {
		const system = createTestSystem();
		const inner = system.createCompiler();

		const order: string[] = [];
		const decorated = withSetupCompiler(inner, async () => {
			order.push('setup');
		});

		order.push('pre');
		await decorated.build({ value: 1 }, noGetRuntime);
		order.push('post');

		expect(order).toEqual(['pre', 'setup', 'post']);
	});

	it('preserves the inner api', async () => {
		const system = createTestSystem();
		const inner = system.createCompiler();
		const decorated = withSetupCompiler(inner, async () => {});

		expect(decorated.api).toBe(inner.api);
	});
});
