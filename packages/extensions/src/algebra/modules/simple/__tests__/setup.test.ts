import { describe, expect, it, vi } from 'vitest';
import type { StaticSignature } from '../../../api/index.js';
import { compile } from '../../../compiler/index.js';
import { createExtensionPoint } from '../../../extension-points/create.js';
import type { RegistryView } from '../../../extension-points/view.js';
import type { BaseRuntime } from '../../../runtime/index.js';
import type { ExtensionModule } from '../types.js';
import { withSetup } from '../setup.js';

type TestAPISurface = {
	register(value: number): void;
};

type TestSignature = StaticSignature<TestAPISurface>;

const extensionPoint = createExtensionPoint<TestSignature>({
	register: true,
});

type TestRuntime = BaseRuntime & {
	readonly value: number;
};

function createModule(): ExtensionModule<TestSignature, TestRuntime> {
	return {
		extensionPoint,
		compiler: {
			async compile(registry: RegistryView<TestSignature, BaseRuntime>) {
				return {
					value: registry.argsFor('register').at(-1)?.[0] ?? 0,
					dispose: vi.fn(async () => {}),
					subscribe: vi.fn(() => () => {}),
				};
			},
		},
	};
}

describe('simple module setup', () => {
	it('decorates the compiler while preserving the extension point', async () => {
		const setup = vi.fn(async (_runtime: TestRuntime) => {});
		const module = withSetup(createModule(), setup);

		const runtime = await compile(
			module.extensionPoint,
			module.compiler,
			(api) => api.register(7),
		);

		expect(runtime.value).toBe(7);
		expect(setup).toHaveBeenCalledWith(runtime);
	});
});
