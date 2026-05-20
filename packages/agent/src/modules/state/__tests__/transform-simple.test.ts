import { describe, expect, it, vi } from 'vitest';
import type { StaticSignature } from '@franklin/extensibility';
import { compile } from '@franklin/extensibility';
import { createExtensionPoint } from '@franklin/extensibility';
import type { RegistryView } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { ExtensionModule } from '@franklin/extensibility/module';
import { fromSimpleModule } from '../transform/index.js';

type DependencySignature = StaticSignature<Record<never, never>>;

const dependencyExtensionPoint = createExtensionPoint<DependencySignature>({});

type DependencyRuntime = BaseRuntime & {
	readonly dependency: string;
};

function createDependencyModule(
	dependency: string,
): ExtensionModule<DependencySignature, DependencyRuntime> {
	return {
		extensionPoint: dependencyExtensionPoint,
		compiler: {
			async compile<ContextRuntime extends BaseRuntime>(
				_registry: RegistryView<DependencySignature, ContextRuntime>,
			) {
				return {
					dependency,
					dispose: vi.fn(async () => {}),
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
