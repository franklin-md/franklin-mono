import { describe, expect, it, vi } from 'vitest';
import type { StaticAPI } from '../../../api/index.js';
import { applyStep, compile } from '../../../compiler/index.js';
import { createExtensionPoint } from '../../../extension-points/create.js';
import type { Registry } from '../../../extension-points/registry.js';
import type { BaseRuntime } from '../../../runtime/index.js';
import type { ExtensionModule } from '../types.js';
import { liftCompilerTransform } from '../transform/index.js';

type TestAPISurface = {
	register(value: number): void;
};

type TestAPI = StaticAPI<TestAPISurface>;

const extensionPoint = createExtensionPoint<TestAPI>({
	register: true,
});

type TestRuntime = BaseRuntime & {
	readonly value: number;
};

function createModule(): ExtensionModule<TestAPI, TestRuntime> {
	return {
		extensionPoint,
		compiler: {
			async compile(registry: Registry<TestAPI>) {
				return {
					value: registry.register.at(-1)?.[0] ?? 0,
					dispose: vi.fn(async () => {}),
					subscribe: vi.fn(() => () => {}),
				};
			},
		},
	};
}

describe('simple module compiler transform', () => {
	it('lifts a compiler transform while preserving the extension point', async () => {
		const effect = vi.fn(async (_runtime: TestRuntime) => {});
		const transform = liftCompilerTransform(
			applyStep<TestAPI, TestRuntime, TestRuntime>(async (runtime) => {
				await effect(runtime);
				return runtime;
			}),
		);
		const module = transform(createModule());

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => api.register(7),
		);

		expect(runtime.value).toBe(7);
		expect(effect).toHaveBeenCalledWith(runtime);
	});
});
