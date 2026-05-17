import { describe, expect, it, vi } from 'vitest';
import { compile } from '../../../compiler/compile.js';
import { createExtensionPoint } from '../../../extension-points/create.js';
import { createApi } from '../../../extension-points/facade.js';
import type { ExtensionPoint } from '../../../extension-points/types.js';
import type { RegistryView } from '../../../extension-points/view.js';
import { createRegistry } from '../../../extension-points/writer.js';
import type { BaseRuntime } from '../../../runtime/types.js';
import { combine, combineAll } from '../combine.js';
import { identityModule } from '../identity.js';
import type { ExtensionModule } from '../types.js';
import type { Signature, StaticSignature } from '../../../api/types.js';

type CounterAPI = {
	registerCount(value: number): void;
};

type CounterSignature = StaticSignature<CounterAPI>;

const counterExtensionPoint = createExtensionPoint<CounterSignature>({
	registerCount: true,
});

type CounterRuntime = BaseRuntime & {
	readonly label: string;
	getCount(): number;
};

function createCounterModule(
	initial: number,
): ExtensionModule<CounterSignature, CounterRuntime> {
	return {
		extensionPoint: counterExtensionPoint,
		compiler: {
			async compile<ContextRuntime extends BaseRuntime>(
				registry: RegistryView<CounterSignature, ContextRuntime>,
			) {
				const registeredCount = registry.argsFor('registerCount').at(-1)?.[0];
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

type LabelAPI = {
	registerLabel(value: string): void;
};

type LabelSignature = StaticSignature<LabelAPI>;

const labelExtensionPoint = createExtensionPoint<LabelSignature>({
	registerLabel: true,
});

type LabelRuntime = BaseRuntime & {
	getLabel(): string;
};

function createLabelModule(
	initial: string,
): ExtensionModule<LabelSignature, LabelRuntime> {
	return {
		extensionPoint: labelExtensionPoint,
		compiler: {
			async compile<ContextRuntime extends BaseRuntime>(
				registry: RegistryView<LabelSignature, ContextRuntime>,
			) {
				const registeredLabel = registry.argsFor('registerLabel').at(-1)?.[0];
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

function apiKeys<A extends Signature>(
	extensionPoint: ExtensionPoint<A>,
): string[] {
	const { writer } = createRegistry<A, A['In']>();
	return Object.keys(createApi<A, A['In']>(extensionPoint, writer));
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

	it('preserves behaviour with left identity', async () => {
		const module = combine(identityModule(), createCounterModule(4));

		expect(apiKeys(module.extensionPoint)).toEqual(['registerCount']);

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => {
				api.registerCount(12);
			},
		);

		expect(runtime.getCount()).toBe(12);
		await runtime.dispose();
	});

	it('preserves behaviour with right identity', async () => {
		const module = combine(createCounterModule(6), identityModule());

		expect(apiKeys(module.extensionPoint)).toEqual(['registerCount']);

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			() => {},
		);

		expect(runtime.getCount()).toBe(6);
		await runtime.dispose();
	});
});
