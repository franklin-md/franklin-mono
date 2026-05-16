import { describe, expect, it, vi } from 'vitest';
import type { StaticAPI } from '../../../api/types.js';
import { compile } from '../../../compiler/compile.js';
import { createExtensionPoint } from '../../../extension-points/create.js';
import type { Registry } from '../../../extension-points/registry.js';
import type { BaseRuntime } from '../../../runtime/types.js';
import type { ExtensionModule } from '../../simple/index.js';
import { fromSimpleModule } from '../transform/index.js';

type DependencyAPI = StaticAPI<Record<never, never>>;

const dependencyExtensionPoint = createExtensionPoint<DependencyAPI>({});

type DependencyRuntime = BaseRuntime & {
	readonly dependency: string;
};

function createDependencyModule(
	dependency: string,
): ExtensionModule<DependencyAPI, DependencyRuntime> {
	return {
		extensionPoint: dependencyExtensionPoint,
		compiler: {
			async compile<ContextRuntime extends BaseRuntime>(
				_registry: Registry<DependencyAPI, ContextRuntime>,
			) {
				return {
					dependency,
					dispose: vi.fn(async () => {}),
					subscribe: vi.fn(() => () => {}),
				};
			},
		},
	};
}

describe('state transform from simple modules', () => {
	it('turns a stateless extension module into an identity-state module', async () => {
		const stateModule = fromSimpleModule(createDependencyModule('dep'));

		expect(stateModule.emptyState()).toEqual({});

		const simple = stateModule.instantiate(stateModule.emptyState());
		const runtime = await compile(
			simple.extensionPoint,
			simple.compiler,
			() => {},
		);

		expect(runtime.dependency).toBe('dep');
		await expect(stateModule.state(runtime).get()).resolves.toEqual({});
		await expect(stateModule.state(runtime).fork()).resolves.toEqual({});
		await expect(stateModule.state(runtime).child()).resolves.toEqual({});
	});
});
