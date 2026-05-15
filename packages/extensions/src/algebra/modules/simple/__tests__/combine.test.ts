import { describe, expect, it, vi } from 'vitest';
import { compile } from '../../../compiler/compile.js';
import { createExtensionPoint } from '../../../extension-points/create.js';
import type { Registry } from '../../../extension-points/registry.js';
import type { ExtensionPoint } from '../../../extension-points/types.js';
import type { BaseRuntime } from '../../../runtime/types.js';
import { combine, combineAll } from '../combine.js';
import type { ExtensionModule } from '../types.js';
import type { API, StaticAPI } from '../../../api/types.js';

type CounterAPISurface = {
	registerCount(value: number): void;
};

type CounterAPI = StaticAPI<CounterAPISurface>;

const counterExtensionPoint = createExtensionPoint<CounterAPI>({
	registerCount: true,
});

type CounterRuntime = BaseRuntime & {
	readonly label: string;
	getCount(): number;
};

function createCounterModule(
	initial: number,
): ExtensionModule<CounterAPI, CounterRuntime> {
	return {
		extensionPoint: counterExtensionPoint,
		compiler: {
			async compile<ContextRuntime extends BaseRuntime>(
				registry: Registry<CounterAPI, ContextRuntime>,
			) {
				const registeredCount = registry.registerCount.at(-1)?.[0];
				const count = registeredCount ?? initial;
				return {
					label: 'counter',
					getCount() {
						return count;
					},
					dispose: vi.fn(async () => {}),
					subscribe: vi.fn(() => () => {}),
				};
			},
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

type LabelRuntime = BaseRuntime & {
	getLabel(): string;
};

function createLabelModule(
	initial: string,
): ExtensionModule<LabelAPI, LabelRuntime> {
	return {
		extensionPoint: labelExtensionPoint,
		compiler: {
			async compile<ContextRuntime extends BaseRuntime>(
				registry: Registry<LabelAPI, ContextRuntime>,
			) {
				const registeredLabel = registry.registerLabel.at(-1)?.[0];
				const label = registeredLabel ?? initial;
				return {
					getLabel() {
						return label;
					},
					dispose: vi.fn(async () => {}),
					subscribe: vi.fn(() => () => {}),
				};
			},
		},
	};
}

function apiKeys<A extends API>(extensionPoint: ExtensionPoint<A>): string[] {
	const registry = extensionPoint.createRegistry();
	return Object.keys(extensionPoint.createApi(registry));
}

describe('simple module combine', () => {
	it('combines extension points and compilers', async () => {
		const module = combine(
			createCounterModule(1),
			createLabelModule('fallback'),
		);

		expect(apiKeys(module.extensionPoint)).toEqual([
			'registerCount',
			'registerLabel',
		]);

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => {
				api.registerCount(7);
				api.registerLabel('registered');
			},
		);

		expect(runtime.label).toBe('counter');
		expect(runtime.getCount()).toBe(7);
		expect(runtime.getLabel()).toBe('registered');
	});

	it('combineAll folds a tuple of simple modules', async () => {
		const module = combineAll([
			createCounterModule(3),
			createLabelModule('tuple'),
		] as const);

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => {
				api.registerCount(9);
			},
		);

		expect(runtime.getCount()).toBe(9);
		expect(runtime.getLabel()).toBe('tuple');
	});
});
