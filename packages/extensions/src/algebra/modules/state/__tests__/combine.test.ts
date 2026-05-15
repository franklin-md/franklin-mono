import { describe, expect, it, vi } from 'vitest';
import type { StaticAPI } from '../../../api/types.js';
import { compile } from '../../../compiler/compile.js';
import { createExtensionPoint } from '../../../extension-points/create.js';
import type { Registry } from '../../../extension-points/registry.js';
import type { BaseRuntime } from '../../../runtime/types.js';
import { buildStateExtensionModule } from '../build.js';
import { combine } from '../combine.js';
import { identityModule } from '../identity.js';
import type { StateExtensionModule, StateHandle } from '../types.js';

type CounterAPISurface = {
	registerCount(value: number): void;
};

type CounterAPI = StaticAPI<CounterAPISurface>;

const counterExtensionPoint = createExtensionPoint<CounterAPI>({
	registerCount: true,
});

type CounterState = {
	counter: {
		value: number;
	};
};

const COUNTER_STATE: unique symbol = Symbol('test/counter-state');

type CounterRuntime = BaseRuntime & {
	getCount(): number;
	readonly [COUNTER_STATE]: StateHandle<CounterState>;
};

function createCounterModule(): StateExtensionModule<
	CounterState,
	CounterAPI,
	CounterRuntime
> {
	return {
		emptyState: () => ({ counter: { value: 0 } }),
		state: (runtime) => runtime[COUNTER_STATE],
		instantiate(state) {
			return {
				extensionPoint: counterExtensionPoint,
				compiler: {
					async compile<ContextRuntime extends BaseRuntime>(
						registry: Registry<CounterAPI, ContextRuntime>,
					) {
						const registered = registry.registerCount.at(-1)?.[0];
						const value = registered ?? state.counter.value;
						return {
							getCount() {
								return value;
							},
							[COUNTER_STATE]: {
								get: vi.fn(async () => ({ counter: { value } })),
								fork: vi.fn(async () => ({ counter: { value } })),
								child: vi.fn(async () => ({ counter: { value: 0 } })),
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

type LabelAPISurface = {
	registerLabel(value: string): void;
};

type LabelAPI = StaticAPI<LabelAPISurface>;

const labelExtensionPoint = createExtensionPoint<LabelAPI>({
	registerLabel: true,
});

type LabelState = {
	label: {
		value: string;
	};
};

const LABEL_STATE: unique symbol = Symbol('test/label-state');

type LabelRuntime = BaseRuntime & {
	getLabel(): string;
	readonly [LABEL_STATE]: StateHandle<LabelState>;
};

function createLabelModule(): StateExtensionModule<
	LabelState,
	LabelAPI,
	LabelRuntime
> {
	return {
		emptyState: () => ({ label: { value: 'fallback' } }),
		state: (runtime) => runtime[LABEL_STATE],
		instantiate(state) {
			return {
				extensionPoint: labelExtensionPoint,
				compiler: {
					async compile<ContextRuntime extends BaseRuntime>(
						registry: Registry<LabelAPI, ContextRuntime>,
					) {
						const registered = registry.registerLabel.at(-1)?.[0];
						const value = registered ?? state.label.value;
						return {
							getLabel() {
								return value;
							},
							[LABEL_STATE]: {
								get: vi.fn(async () => ({ label: { value } })),
								fork: vi.fn(async () => ({ label: { value } })),
								child: vi.fn(async () => ({ label: { value: 'child' } })),
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

describe('state module combine', () => {
	it('merges empty state and instantiates a combined simple module', async () => {
		const module = combine(createCounterModule(), createLabelModule());
		const state = module.emptyState();

		expect(state).toEqual({
			counter: { value: 0 },
			label: { value: 'fallback' },
		});

		const simple = module.instantiate(state);
		const runtime = await compile(
			simple.extensionPoint,
			simple.compiler,
			(api) => {
				api.registerCount(5);
				api.registerLabel('registered');
			},
		);

		expect(runtime.getCount()).toBe(5);
		expect(runtime.getLabel()).toBe('registered');
	});

	it('combines state handles for get, fork, and child', async () => {
		const module = combine(createCounterModule(), createLabelModule());
		const simple = module.instantiate({
			counter: { value: 8 },
			label: { value: 'parent' },
		});
		const runtime = await compile(
			simple.extensionPoint,
			simple.compiler,
			() => {},
		);
		const handle = module.state(runtime);

		await expect(handle.get()).resolves.toEqual({
			counter: { value: 8 },
			label: { value: 'parent' },
		});
		await expect(handle.fork()).resolves.toEqual({
			counter: { value: 8 },
			label: { value: 'parent' },
		});
		await expect(handle.child()).resolves.toEqual({
			counter: { value: 0 },
			label: { value: 'child' },
		});
	});

	it('buildStateExtensionModule folds a module tuple', async () => {
		const module = buildStateExtensionModule([
			createCounterModule(),
			createLabelModule(),
		] as const);
		const simple = module.instantiate(module.emptyState());
		const runtime = await compile(
			simple.extensionPoint,
			simple.compiler,
			(api) => {
				api.registerLabel('builder');
			},
		);

		expect(runtime.getCount()).toBe(0);
		expect(runtime.getLabel()).toBe('builder');
	});

	it('preserves state and runtime behaviour with left identity', async () => {
		const module = combine(identityModule(), createCounterModule());
		const state = module.emptyState();

		expect(state).toEqual({ counter: { value: 0 } });

		const simple = module.instantiate({ counter: { value: 14 } });
		const runtime = await compile(
			simple.extensionPoint,
			simple.compiler,
			() => {},
		);

		expect(runtime.getCount()).toBe(14);
		await expect(module.state(runtime).get()).resolves.toEqual({
			counter: { value: 14 },
		});
	});

	it('preserves state and runtime behaviour with right identity', async () => {
		const module = combine(createCounterModule(), identityModule());
		const state = module.emptyState();

		expect(state).toEqual({ counter: { value: 0 } });

		const simple = module.instantiate({ counter: { value: 15 } });
		const runtime = await compile(
			simple.extensionPoint,
			simple.compiler,
			() => {},
		);

		expect(runtime.getCount()).toBe(15);
		await expect(module.state(runtime).get()).resolves.toEqual({
			counter: { value: 15 },
		});
	});
});
