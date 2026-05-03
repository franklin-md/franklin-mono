import { describe, expect, it } from 'vitest';
import type { API, BoundAPI } from '../algebra/api/index.js';
import type { BaseRuntime } from '../algebra/runtime/index.js';
import type { Extension } from '../algebra/extension/index.js';
import * as rootExports from '../index.js';
import { compileAll, compilerFromApi, defineExtension } from '../index.js';

type TestAPISurface = { register(label: string): void };

interface TestAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: TestAPISurface;
}

describe('package exports', () => {
	it('re-exports defineExtension as the authoring helper', () => {
		const extension = () => {};

		expect(defineExtension<[]>(extension)).toBe(extension);
		expect('createExtension' in rootExports).toBe(false);
	});

	it('re-exports compileAll from the root barrel', async () => {
		const calls: string[] = [];
		let buildCalls = 0;
		const api: TestAPISurface = {
			register(label: string) {
				calls.push(label);
			},
		};
		const runtime: BaseRuntime = {
			dispose: async () => {},
			subscribe: () => () => {},
		};
		const compiler = compilerFromApi<TestAPI, BaseRuntime>(api, async () => {
			buildCalls += 1;
			return runtime;
		});
		const extensions: Extension<BoundAPI<TestAPI, BaseRuntime>>[] = [
			(api) => api.register('one'),
			(api) => api.register('two'),
		];

		await expect(compileAll(compiler, extensions)).resolves.toBe(runtime);
		expect(calls).toEqual(['one', 'two']);
		expect(buildCalls).toBe(1);
	});
});
