import { describe, expect, it } from 'vitest';
import type { Signature } from '../../api/types.js';
import type { Extension } from '../../extension/types.js';
import { createExtensionPoint } from '../../extension-points/create.js';
import { createApi } from '../../extension-points/facade.js';
import { createRegistryView } from '../../extension-points/view.js';
import { createRegistry } from '../../extension-points/writer.js';
import type { BaseRuntime } from '../../runtime/types.js';
import { priority, priorityLevels } from '../priority.js';

type TestAPI = {
	readonly registerText: (value: string) => void;
};

interface TestSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: TestAPI;
}

const extensionPoint = createExtensionPoint<TestSignature>({
	registerText: true,
});

describe('priority transform', () => {
	it('publishes named priority levels as a readable table', () => {
		expect(priorityLevels).toEqual({
			highest: Infinity,
			high: 100,
			default: 0,
			low: -100,
			lowest: -Infinity,
		});
		expect(priority.levels).toBe(priorityLevels);
		expect(priority).not.toHaveProperty('at');
	});

	it('derives same-shape API facades that register priority metadata', () => {
		const { registry, writer } = createRegistry<TestSignature, BaseRuntime>();
		const api = createApi<TestSignature, BaseRuntime>(extensionPoint, writer);

		priority.default(api).registerText('default-one');
		priority.high(api).registerText('high');
		priority.highest(api).registerText('highest');
		priority.low(api).registerText('low');
		priority.lowest(api).registerText('lowest');
		api.registerText('default-two');

		expect(createRegistryView(registry).argsFor('registerText')).toEqual([
			['highest'],
			['high'],
			['default-one'],
			['default-two'],
			['low'],
			['lowest'],
		]);
	});

	it('wraps whole extensions that register priority metadata', () => {
		const { registry, writer } = createRegistry<TestSignature, BaseRuntime>();
		const api = createApi<TestSignature, BaseRuntime>(extensionPoint, writer);
		const extensions: Extension<TestAPI>[] = [
			priority.default((api: TestAPI) => api.registerText('default-one')),
			priority.high((api: TestAPI) => api.registerText('high')),
			priority.highest((api: TestAPI) => api.registerText('highest')),
			priority.low((api: TestAPI) => api.registerText('low')),
			priority.lowest((api: TestAPI) => api.registerText('lowest')),
			(api) => api.registerText('default-two'),
		];

		for (const extension of extensions) {
			extension(api);
		}

		expect(createRegistryView(registry).argsFor('registerText')).toEqual([
			['highest'],
			['high'],
			['default-one'],
			['default-two'],
			['low'],
			['lowest'],
		]);
	});
});
