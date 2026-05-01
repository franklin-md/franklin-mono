import { describe, expect, it } from 'vitest';
import type { API, BoundAPI } from '../algebra/api/index.js';
import type { Compiler } from '../algebra/compiler/types.js';
import type { BaseRuntime } from '../algebra/runtime/index.js';
import type { Extension } from '../algebra/types/extension.js';
import { compileAll } from '../index.js';

type TestAPISurface = { register(label: string): void };

interface TestAPI extends API {
	readonly In: BaseRuntime;
	readonly Out: TestAPISurface;
}

describe('package exports', () => {
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
		const compiler: Compiler<TestAPI, BaseRuntime> = {
			register<ContextRuntime extends BaseRuntime>(
				use: (api: BoundAPI<TestAPI, ContextRuntime>) => void,
			): void {
				use(api);
			},
			async build() {
				buildCalls += 1;
				return runtime;
			},
		};
		const extensions: Extension<BoundAPI<TestAPI, BaseRuntime>>[] = [
			(api) => api.register('one'),
			(api) => api.register('two'),
		];

		await expect(compileAll(compiler, extensions)).resolves.toBe(runtime);
		expect(calls).toEqual(['one', 'two']);
		expect(buildCalls).toBe(1);
	});
});
