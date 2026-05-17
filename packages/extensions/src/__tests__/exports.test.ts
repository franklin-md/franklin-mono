import { describe, expect, it } from 'vitest';
import type { Signature } from '../algebra/api/index.js';
import type { BaseRuntime } from '../algebra/runtime/index.js';
import * as rootExports from '../index.js';
import { createExtensionPoint, defineExtension } from '../index.js';
import type { RegistryView } from '../index.js';
import type { Apply } from '@franklin/lib';

type TestAPI = { register(label: string): void };

interface TestSignature extends Signature {
	readonly In: BaseRuntime;
	readonly Out: TestAPI;
}

const testExtensionPoint = createExtensionPoint<TestSignature>({
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
		expect('identityAPI' in rootExports).toBe(false);
		expect('identityCompiler' in rootExports).toBe(false);
		expect('identityRuntime' in rootExports).toBe(false);
		expect('identityState' in rootExports).toBe(false);
		expect('identityStateHandle' in rootExports).toBe(false);
		expect('identityModule' in rootExports).toBe(false);
		expect('createRuntime' in rootExports).toBe(false);
		expect(typeof rootExports.buildStateExtensionModule).toBe('function');
		expect(typeof rootExports.liftExtensionModule).toBe('function');
		expect(typeof rootExports.withSetup).toBe('function');
		expect(typeof rootExports.transformCompiler).toBe('function');
		expect(typeof rootExports.composeCompilerSteps).toBe('function');
		expect(typeof rootExports.withSetupCompiler).toBe('function');
		expect('createRegistry' in rootExports).toBe(false);
		expect('createApi' in rootExports).toBe(false);
		expect('deriveApi' in rootExports).toBe(false);
		expect('createRegistryView' in rootExports).toBe(false);
		expect('combineExtensionPoints' in rootExports).toBe(false);
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
				registry: RegistryView<TestSignature, ContextRuntime>,
			) {
				buildCalls += 1;
				for (const [label] of registry.argsFor('register')) {
					calls.push(label);
				}
				return runtime;
			},
		};
		const extension = rootExports.reduceExtensions<
			Apply<TestSignature, BaseRuntime>
		>(
			(api) => api.register('one'),
			(api) => api.register('two'),
		);

		await expect(
			rootExports.compile(testExtensionPoint, compiler, extension),
		).resolves.toBe(runtime);
		expect(calls).toEqual(['one', 'two']);
		expect(buildCalls).toBe(1);
	});
});
