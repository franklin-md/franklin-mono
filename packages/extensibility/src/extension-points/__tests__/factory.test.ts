import { describe, expect, it } from 'vitest';
import type { Signature } from '../../api/types.js';
import type { BaseRuntime } from '../../runtime/types.js';
import { createExtensionPoint } from '../create.js';
import { createApi, deriveApi } from '../facade.js';
import type { ExtensionPoint } from '../types.js';
import { createRegistryView } from '../view.js';
import { createRegistry } from '../writer.js';

type TestAPI = {
	readonly registerText: (value: string) => void;
	readonly registerPair: (first: number, second: boolean) => void;
};

interface TestSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: TestAPI;
}

interface EmptySignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: Record<never, never>;
}

const hiddenRegister = Symbol('hiddenRegister');

type SymbolAPI = {
	readonly visible: (value: string) => void;
	readonly [hiddenRegister]: (value: number) => void;
};

interface SymbolSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: SymbolAPI;
}

describe('createExtensionPoint', () => {
	it('creates a registry and API methods for every contribution key', () => {
		const extensionPoint = createExtensionPoint<TestSignature>({
			registerText: true,
			registerPair: true,
		});

		const { registry, writer } = createRegistry<TestSignature, BaseRuntime>();
		expect(registry).toEqual({
			effects: [],
		});

		const api = createApi<TestSignature, BaseRuntime>(extensionPoint, writer);
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

	it('supports symbol-keyed contribution methods without exposing them through Object.keys', () => {
		const extensionPoint = createExtensionPoint<SymbolSignature>({
			visible: true,
			[hiddenRegister]: true,
		});
		const { registry, writer } = createRegistry<SymbolSignature, BaseRuntime>();
		const api = createApi<SymbolSignature, BaseRuntime>(extensionPoint, writer);

		expect(Object.keys(api)).toEqual(['visible']);
		expect(Reflect.ownKeys(api)).toContain(hiddenRegister);

		api.visible('public');
		api[hiddenRegister](42);

		const view = createRegistryView(registry);
		expect(view.argsFor('visible')).toEqual([['public']]);
		expect(view.argsFor(hiddenRegister)).toEqual([[42]]);
	});

	it('supports identity extension points with no contribution keys', () => {
		const extensionPoint = createExtensionPoint<TestSignature>({
			registerText: true,
			registerPair: true,
		});
		const identity = createExtensionPoint<EmptySignature>({});

		expect(
			Object.keys(
				createApi<TestSignature, BaseRuntime>(
					extensionPoint,
					createRegistry<TestSignature, BaseRuntime>().writer,
				),
			),
		).toEqual(['registerText', 'registerPair']);
		expect(
			createApi(identity, createRegistry<EmptySignature, BaseRuntime>().writer),
		).toEqual({});
	});

	it('derives a same-shape API facade with a transformed writer', () => {
		const extensionPoint = createExtensionPoint<TestSignature>({
			registerText: true,
			registerPair: true,
		});
		const { registry, writer } = createRegistry<TestSignature, BaseRuntime>();
		const api = createApi<TestSignature, BaseRuntime>(extensionPoint, writer);
		const prefixed = deriveApi<TestSignature, BaseRuntime>(
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
		interface LabeledSignature extends Signature {
			readonly In: BaseRuntime;
			readonly Out: TestAPI & { readonly label: string };
		}
		const extensionPoint: ExtensionPoint<LabeledSignature> = (writer) => ({
			label: 'test',
			registerText(value) {
				writer({ name: 'registerText', value: [value] });
			},
			registerPair(first, second) {
				writer({ name: 'registerPair', value: [first, second] });
			},
		});
		const { registry, writer } = createRegistry<
			LabeledSignature,
			BaseRuntime
		>();
		const api = createApi<LabeledSignature, BaseRuntime>(
			extensionPoint,
			writer,
		);

		expect(api.label).toBe('test');
		api.registerText('hello');
		expect(createRegistryView(registry).argsFor('registerText')).toEqual([
			['hello'],
		]);
	});
});
