import { describe, expect, it, vi } from 'vitest';
import { compile } from '../../../compiler/index.js';
import { createExtensionPoint } from '../../../extension-points/create.js';
import type { RegistryView } from '../../../extension-points/view.js';
import type { BaseRuntime } from '../../../runtime/index.js';
import type { StaticSignature } from '../../../api/index.js';
import type { ExtensionModule } from '../../simple/index.js';
import type { StateExtensionModule, StateHandle } from '../types.js';
import { buildStateExtensionModule } from '../build.js';

type CounterAPI = {
	registerCount(value: number): void;
};

type CounterSignature = StaticSignature<CounterAPI>;

const counterExtensionPoint = createExtensionPoint<CounterSignature>({
	registerCount: true,
});

type CounterState = {
	readonly counter: {
		readonly value: number;
	};
};

const COUNTER_STATE: unique symbol = Symbol('test/counter-state');

type CounterRuntime = BaseRuntime & {
	getCount(): number;
	readonly [COUNTER_STATE]: StateHandle<CounterState>;
};

function createCounterModule(): StateExtensionModule<
	CounterState,
	CounterSignature,
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
						registry: RegistryView<CounterSignature, ContextRuntime>,
					) {
						const value =
							registry.argsFor('registerCount').at(-1)?.[0] ??
							state.counter.value;
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
						};
					},
				},
			};
		},
	};
}

type DependencySignature = StaticSignature<Record<never, never>>;

const dependencyExtensionPoint = createExtensionPoint<DependencySignature>({});

type DependencyRuntime = BaseRuntime & {
	readonly dependency: string;
};

function createDependencyModule(
	dependency: string,
): ExtensionModule<DependencySignature, DependencyRuntime> {
	return {
		extensionPoint: dependencyExtensionPoint,
		compiler: {
			async compile() {
				return {
					dependency,
					dispose: vi.fn(async () => {}),
				};
			},
		},
	};
}

describe('buildStateExtensionModule', () => {
	it('lifts simple modules into stateful composition', async () => {
		const module = buildStateExtensionModule([
			createCounterModule(),
			createDependencyModule('dep'),
		] as const);

		expect(module.emptyState()).toEqual({ counter: { value: 0 } });

		const simple = module.instantiate({ counter: { value: 3 } });
		const runtime = await compile(
			simple.extensionPoint,
			simple.compiler,
			(api) => {
				api.registerCount(8);
			},
		);

		expect(runtime.getCount()).toBe(8);
		expect(runtime.dependency).toBe('dep');
		await expect(module.state(runtime).get()).resolves.toEqual({
			counter: { value: 8 },
		});
	});
});
