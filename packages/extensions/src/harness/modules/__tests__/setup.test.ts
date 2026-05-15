import { describe, expect, it, vi } from 'vitest';
import type { StaticAPI } from '../../../algebra/api/types.js';
import type { Registry } from '../../../algebra/extension-points/registry.js';
import { createExtensionPoint } from '../../../algebra/extension-points/create.js';
import type {
	BaseRuntime,
	StateHandle,
} from '../../../algebra/runtime/types.js';
import { withSetup, withSetupCompiler } from '../setup.js';
import type { HarnessModule } from '../module.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TestState = { value: number };
type TestAPISurface = { register(n: number): void };
type TestAPI = StaticAPI<TestAPISurface>;

const testExtensionPoint = createExtensionPoint<TestAPI>({
	register: true,
});

const TEST_STATE: unique symbol = Symbol('test/setup-state');

type TestRuntime = BaseRuntime & {
	getValue(): number;
	readonly [TEST_STATE]: StateHandle<TestState>;
};

function createTestSystem(): HarnessModule<TestState, TestAPI, TestRuntime> {
	return {
		emptyState: () => ({ value: 0 }),
		state: (runtime) => runtime[TEST_STATE],
		instantiate(state) {
			return {
				extensionPoint: testExtensionPoint,
				compiler: {
					async compile<ContextRuntime extends BaseRuntime>(
						registry: Registry<TestAPI, ContextRuntime>,
					) {
						const registered = registry.register.at(-1)?.[0];
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

		const simple = decorated.instantiate({ value: 42 });
		const registry = simple.extensionPoint.createRegistry();

		order.push('before-build');
		await simple.compiler.compile(
			registry as Registry<TestAPI, TestRuntime>,
			noGetRuntime,
		);
		order.push('after-build');

		expect(order).toEqual(['before-build', 'setup', 'after-build']);
	});

	it('passes the built runtime to setup', async () => {
		const system = createTestSystem();
		let captured: TestRuntime | undefined;

		const decorated = withSetup(system, async (runtime) => {
			captured = runtime;
		});

		const simple = decorated.instantiate({ value: 7 });
		const registry = simple.extensionPoint.createRegistry();
		const built = await simple.compiler.compile(
			registry as Registry<TestAPI, TestRuntime>,
			noGetRuntime,
		);

		expect(captured).toBe(built);
		expect(captured!.getValue()).toBe(7);
	});

	it('passes the state to setup', async () => {
		const system = createTestSystem();
		let capturedState: TestState | undefined;

		const decorated = withSetup(system, async (_runtime, state) => {
			capturedState = state;
		});

		const simple = decorated.instantiate({ value: 99 });
		const registry = simple.extensionPoint.createRegistry();
		await simple.compiler.compile(
			registry as Registry<TestAPI, TestRuntime>,
			noGetRuntime,
		);

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

		const simple = decorated.instantiate({ value: 0 });
		const registry = simple.extensionPoint.createRegistry();
		simple.extensionPoint.createApi<TestRuntime>(registry).register(42);
		const built = await simple.compiler.compile(
			registry as Registry<TestAPI, TestRuntime>,
			noGetRuntime,
		);

		expect(built.getValue()).toBe(42);
	});

	it('setup can observe the runtime', async () => {
		const system = createTestSystem();
		const setupSpy = vi.fn();

		const decorated = withSetup(system, async (runtime) => {
			setupSpy(runtime.getValue());
		});

		const simple = decorated.instantiate({ value: 5 });
		const registry = simple.extensionPoint.createRegistry();
		await simple.compiler.compile(
			registry as Registry<TestAPI, TestRuntime>,
			noGetRuntime,
		);

		expect(setupSpy).toHaveBeenCalledWith(5);
	});
});

// ---------------------------------------------------------------------------
// withSetupCompiler (compiler-level)
// ---------------------------------------------------------------------------

describe('withSetupCompiler', () => {
	it('wraps build to run setup after inner build resolves', async () => {
		const system = createTestSystem();
		const simple = system.instantiate({ value: 1 });
		const inner = simple.compiler;

		const order: string[] = [];
		const decorated = withSetupCompiler(inner, async () => {
			order.push('setup');
		});

		order.push('pre');
		const registry = simple.extensionPoint.createRegistry();
		await decorated.compile(
			registry as Registry<TestAPI, TestRuntime>,
			noGetRuntime,
		);
		order.push('post');

		expect(order).toEqual(['pre', 'setup', 'post']);
	});

	it('preserves the inner registration surface', async () => {
		const system = createTestSystem();
		const simple = system.instantiate({ value: 0 });
		const inner = simple.compiler;
		const decorated = withSetupCompiler(inner, async () => {});

		const registry = simple.extensionPoint.createRegistry();
		simple.extensionPoint.createApi<TestRuntime>(registry).register(123);
		const built = await decorated.compile(
			registry as Registry<TestAPI, TestRuntime>,
			noGetRuntime,
		);

		expect(built.getValue()).toBe(123);
	});
});
