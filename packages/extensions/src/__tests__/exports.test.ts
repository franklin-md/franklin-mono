import { describe, expect, it } from 'vitest';
import type { API, BoundAPI } from '../algebra/api/index.js';
import type { BaseRuntime } from '../algebra/runtime/index.js';
import type { Extension } from '../algebra/extension/index.js';
import type { Registry } from '../algebra/extension-points/registry.js';
import * as rootExports from '../index.js';
import { compileAll, createExtensionPoint, defineExtension } from '../index.js';

type TestAPISurface = { register(label: string): void };

interface TestAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: TestAPISurface;
}

const testExtensionPoint = createExtensionPoint<TestAPI>({
	register: true,
});

describe('package exports', () => {
	it('re-exports defineExtension as the authoring helper', () => {
		const extension = () => {};

		expect(defineExtension<[]>(extension)).toBe(extension);
		expect('createExtension' in rootExports).toBe(false);
		expect(rootExports.createExtensionPoint).toBe(createExtensionPoint);
		expect('coreExtensionPoint' in rootExports).toBe(false);
		expect('createCoreApi' in rootExports).toBe(false);
		expect('createCoreRegistry' in rootExports).toBe(false);
		expect('identityExtensionPoint' in rootExports).toBe(false);
		expect('storeExtensionPoint' in rootExports).toBe(false);
		expect('createStoreApi' in rootExports).toBe(false);
		expect('createStoreExtensionRegistry' in rootExports).toBe(false);
	});

	it('re-exports compileAll from the root barrel', async () => {
		const calls: string[] = [];
		let buildCalls = 0;
		const runtime: BaseRuntime = {
			dispose: async () => {},
			subscribe: () => () => {},
		};
		const compiler = {
			async compile<ContextRuntime extends BaseRuntime>(
				registry: Registry<TestAPI, ContextRuntime>,
			) {
				buildCalls += 1;
				for (const [label] of registry.register) calls.push(label);
				return runtime;
			},
		};
		const extensions: Extension<BoundAPI<TestAPI, BaseRuntime>>[] = [
			(api) => api.register('one'),
			(api) => api.register('two'),
		];

		await expect(
			compileAll(testExtensionPoint, compiler, extensions),
		).resolves.toBe(runtime);
		expect(calls).toEqual(['one', 'two']);
		expect(buildCalls).toBe(1);
	});
});
