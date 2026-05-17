import { describe, expect, it, vi } from 'vitest';
import type { StaticAPI } from '../../../api/index.js';
import { applyStep, compile } from '../../../compiler/index.js';
import { createExtensionPoint } from '../../../extension-points/create.js';
import type { Registry } from '../../../extension-points/registry.js';
import type { BaseRuntime, StateHandle } from '../../../runtime/index.js';
import type { StateExtensionModule } from '../types.js';
import {
	liftCompilerTransform,
	liftModuleTransform,
} from '../transform/index.js';

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

const TEST_STATE: unique symbol = Symbol('test/state-transform');

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
					async compile(registry: Registry<TestAPI>) {
						const value = registry.register.at(-1)?.[0] ?? state.value;
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

describe('state module compiler transform', () => {
	it('lifts state-aware module transforms through instantiation', async () => {
		const effect = vi.fn(
			async (_runtime: TestRuntime, _state: TestState) => {},
		);
		const transform = liftModuleTransform<
			TestState,
			TestAPI,
			TestRuntime,
			TestRuntime
		>((state) => (simple) => ({
			extensionPoint: simple.extensionPoint,
			compiler: applyStep<TestAPI, TestRuntime, TestRuntime>(
				async (runtime) => {
					await effect(runtime, state);
					return runtime;
				},
			)(simple.compiler),
		}));
		const module = transform(createModule());
		const state = { value: 5 };
		const simple = module.instantiate(state);

		const runtime = await compile(
			simple.extensionPoint,
			simple.compiler,
			(api) => api.register(13),
		);

		expect(runtime.value).toBe(13);
		expect(effect).toHaveBeenCalledWith(runtime, state);
		await expect(module.state(runtime).get()).resolves.toEqual({ value: 13 });
	});

	it('lifts state-aware compiler transforms through instantiation', async () => {
		const effect = vi.fn(
			async (_runtime: TestRuntime, _state: TestState) => {},
		);
		const transform = liftCompilerTransform((state: TestState) =>
			applyStep<TestAPI, TestRuntime, TestRuntime>(async (runtime) => {
				await effect(runtime, state);
				return runtime;
			}),
		);
		const module = transform(createModule());
		const state = { value: 3 };
		const simple = module.instantiate(state);

		const runtime = await compile(
			simple.extensionPoint,
			simple.compiler,
			(api) => api.register(11),
		);

		expect(runtime.value).toBe(11);
		expect(effect).toHaveBeenCalledWith(runtime, state);
		await expect(module.state(runtime).get()).resolves.toEqual({ value: 11 });
	});
});
