import { describe, expect, it, vi } from 'vitest';
import type { BoundAPI, StaticAPI } from '../../api/types.js';
import type { Compiler } from '../../compiler/types.js';
import type { BaseRuntime, StateHandle } from '../../runtime/types.js';
import { withSetup, withSetupCompiler } from '../setup.js';
import type { RuntimeSystem } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TestState = { value: number };
type TestAPISurface = { register(n: number): void };
type TestAPI = StaticAPI<TestAPISurface>;

const TEST_STATE: unique symbol = Symbol('test/setup-state');

type TestRuntime = BaseRuntime & {
	getValue(): number;
	readonly [TEST_STATE]: StateHandle<TestState>;
};

function createTestSystem(): RuntimeSystem<TestState, TestAPI, TestRuntime> {
	return {
		emptyState: () => ({ value: 0 }),
		state: (runtime) => runtime[TEST_STATE],
		createCompiler(state): Compiler<TestAPI, TestRuntime> {
			let registered: number | undefined;
			const api: TestAPISurface = {
				register(n: number) {
					registered = n;
				},
			};
			return {
				register<ContextRuntime extends TestRuntime>(
					use: (api: BoundAPI<TestAPI, ContextRuntime>) => void,
				): void {
					use(api);
				},
				async build() {
					const val = registered ?? state.value;
					return {
						getValue: () => val,
						[TEST_STATE]: {
							get: async () => ({ value: val }),
							fork: async () => ({ value: val }),
							child: async () => ({ value: 0 }),
						},
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

		const compiler = decorated.createCompiler({ value: 42 });

		order.push('before-build');
		await compiler.build(noGetRuntime);
		order.push('after-build');

		expect(order).toEqual(['before-build', 'setup', 'after-build']);
	});

	it('passes the built runtime to setup', async () => {
		const system = createTestSystem();
		let captured: TestRuntime | undefined;

		const decorated = withSetup(system, async (runtime) => {
			captured = runtime;
		});

		const compiler = decorated.createCompiler({ value: 7 });
		const built = await compiler.build(noGetRuntime);

		expect(captured).toBe(built);
		expect(captured!.getValue()).toBe(7);
	});

	it('passes the state to setup', async () => {
		const system = createTestSystem();
		let capturedState: TestState | undefined;

		const decorated = withSetup(system, async (_runtime, state) => {
			capturedState = state;
		});

		const compiler = decorated.createCompiler({ value: 99 });
		await compiler.build(noGetRuntime);

		expect(capturedState).toEqual({ value: 99 });
	});

	it('preserves emptyState', () => {
		const system = createTestSystem();
		const decorated = withSetup(system, async () => {});

		expect(decorated.emptyState()).toEqual({ value: 0 });
	});

	it('preserves compiler registration', async () => {
		const system = createTestSystem();
		const decorated = withSetup(system, async () => {});

		const compiler = decorated.createCompiler({ value: 0 });
		compiler.register<TestRuntime>((api) => api.register(42));
		const built = await compiler.build(noGetRuntime);

		expect(built.getValue()).toBe(42);
	});

	it('setup can observe the runtime', async () => {
		const system = createTestSystem();
		const setupSpy = vi.fn();

		const decorated = withSetup(system, async (runtime) => {
			setupSpy(runtime.getValue());
		});

		const compiler = decorated.createCompiler({ value: 5 });
		await compiler.build(noGetRuntime);

		expect(setupSpy).toHaveBeenCalledWith(5);
	});
});

// ---------------------------------------------------------------------------
// withSetupCompiler (compiler-level)
// ---------------------------------------------------------------------------

describe('withSetupCompiler', () => {
	it('wraps build to run setup after inner build resolves', async () => {
		const system = createTestSystem();
		const inner = system.createCompiler({ value: 1 });

		const order: string[] = [];
		const decorated = withSetupCompiler(inner, async () => {
			order.push('setup');
		});

		order.push('pre');
		await decorated.build(noGetRuntime);
		order.push('post');

		expect(order).toEqual(['pre', 'setup', 'post']);
	});

	it('preserves the inner registration surface', async () => {
		const system = createTestSystem();
		const inner = system.createCompiler({ value: 0 });
		const decorated = withSetupCompiler(inner, async () => {});

		decorated.register<TestRuntime>((api) => api.register(123));
		const built = await decorated.build(noGetRuntime);

		expect(built.getValue()).toBe(123);
	});
});
