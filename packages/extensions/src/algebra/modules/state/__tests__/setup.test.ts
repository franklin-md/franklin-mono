import { describe, expect, it, vi } from 'vitest';
import type { StaticAPI } from '../../../api/index.js';
import { compile } from '../../../compiler/index.js';
import { createExtensionPoint } from '../../../extension-points/create.js';
import type { RegistryView } from '../../../extension-points/view.js';
import type { BaseRuntime, StateHandle } from '../../../runtime/index.js';
import type { StateExtensionModule } from '../types.js';
import { withSetup } from '../setup.js';

type TestState = {
	readonly value: number;
};

type TestAPISurface = {
	register(value: number): void;
};

type TestAPI = StaticAPI<TestAPISurface>;

const extensionPoint = createExtensionPoint<TestAPI>({
	register: true,
});

const TEST_STATE: unique symbol = Symbol('test/state-setup');

type TestRuntime = BaseRuntime & {
	readonly value: number;
	readonly [TEST_STATE]: StateHandle<TestState>;
};

function createModule(): StateExtensionModule<TestState, TestAPI, TestRuntime> {
	return {
		emptyState: () => ({ value: 0 }),
		state: (runtime) => runtime[TEST_STATE],
		instantiate(state) {
			return {
				extensionPoint,
				compiler: {
					async compile(registry: RegistryView<TestAPI, BaseRuntime>) {
						const value =
							registry.argsFor('register').at(-1)?.[0] ?? state.value;
						return {
							value,
							[TEST_STATE]: {
								get: vi.fn(async () => ({ value })),
								fork: vi.fn(async () => ({ value })),
								child: vi.fn(async () => ({ value: 0 })),
							},
							dispose: vi.fn(async () => {}),
							subscribe: vi.fn(() => () => {}),
						};
					},
				},
			};
		},
	};
}

describe('state module setup', () => {
	it('decorates instantiated compilers with runtime and state setup', async () => {
		const setup = vi.fn(async (_runtime: TestRuntime, _state: TestState) => {});
		const module = withSetup(createModule(), setup);
		const state = { value: 3 };
		const simple = module.instantiate(state);

		const runtime = await compile(
			simple.extensionPoint,
			simple.compiler,
			(api) => api.register(11),
		);

		expect(runtime.value).toBe(11);
		expect(setup).toHaveBeenCalledWith(runtime, state);
		await expect(module.state(runtime).get()).resolves.toEqual({ value: 11 });
	});
});
