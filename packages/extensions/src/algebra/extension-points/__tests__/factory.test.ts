import { describe, expect, it } from 'vitest';
import type { API } from '../../api/types.js';
import type { BaseRuntime } from '../../runtime/types.js';
import { createExtensionPoint } from '../create.js';
import { createApi, deriveApi } from '../facade.js';
import type { ExtensionPoint } from '../types.js';
import { createRegistryView } from '../view.js';
import { createRegistry } from '../writer.js';

type TestAPISurface = {
	readonly registerText: (value: string) => void;
	readonly registerPair: (first: number, second: boolean) => void;
};

interface TestAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: TestAPISurface;
}

interface EmptyAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: Record<never, never>;
}

describe('createExtensionPoint', () => {
	it('creates a registry and API methods for every contribution key', () => {
		const extensionPoint = createExtensionPoint<TestAPI>({
			registerText: true,
			registerPair: true,
		});

		const { registry, writer } = createRegistry<TestAPI, BaseRuntime>();
		expect(registry).toEqual({
			effects: [],
		});

		const api = createApi<TestAPI, BaseRuntime>(extensionPoint, writer);
		api.registerText('hello');
		api.registerPair(1, true);

		expect(registry).toEqual({
			effects: [
				{ name: 'registerText', value: ['hello'] },
				{ name: 'registerPair', value: [1, true] },
			],
		});
		const view = createRegistryView(registry);
		expect(view.argsFor('registerText')).toEqual([['hello']]);
		expect(view.argsFor('registerPair')).toEqual([[1, true]]);
	});

	it('supports identity extension points with no contribution keys', () => {
		const extensionPoint = createExtensionPoint<TestAPI>({
			registerText: true,
			registerPair: true,
		});
		const identity = createExtensionPoint<EmptyAPI>({});

		expect(
			Object.keys(
				createApi<TestAPI, BaseRuntime>(
					extensionPoint,
					createRegistry<TestAPI, BaseRuntime>().writer,
				),
			),
		).toEqual(['registerText', 'registerPair']);
		expect(
			createApi(identity, createRegistry<EmptyAPI, BaseRuntime>().writer),
		).toEqual({});
	});

	it('derives a same-shape API facade with a transformed writer', () => {
		const extensionPoint = createExtensionPoint<TestAPI>({
			registerText: true,
			registerPair: true,
		});
		const { registry, writer } = createRegistry<TestAPI, BaseRuntime>();
		const api = createApi<TestAPI, BaseRuntime>(extensionPoint, writer);
		const prefixed = deriveApi<TestAPI, BaseRuntime>(
			api,
			(write) => (effect) =>
				write(
					effect.name === 'registerText'
						? { ...effect, value: [`derived:${effect.value[0]}`] }
						: effect,
				),
		);

		prefixed.registerText('hello');
		api.registerText('plain');

		expect(createRegistryView(registry).argsFor('registerText')).toEqual([
			['derived:hello'],
			['plain'],
		]);
	});

	it('allows explicit extension points to return non-registration API values', () => {
		interface LabeledAPI extends API {
			readonly In: BaseRuntime;
			readonly Out: TestAPISurface & { readonly label: string };
		}
		const extensionPoint: ExtensionPoint<LabeledAPI> = (writer) => ({
			label: 'test',
			registerText(value) {
				writer({ name: 'registerText', value: [value] });
			},
			registerPair(first, second) {
				writer({ name: 'registerPair', value: [first, second] });
			},
		});
		const { registry, writer } = createRegistry<LabeledAPI, BaseRuntime>();
		const api = createApi<LabeledAPI, BaseRuntime>(extensionPoint, writer);

		expect(api.label).toBe('test');
		api.registerText('hello');
		expect(createRegistryView(registry).argsFor('registerText')).toEqual([
			['hello'],
		]);
	});
});
