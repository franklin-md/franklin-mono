import type { Compiler } from '../../compiler/types.js';
import { createExtensionPoint } from '../../extension-points/create.js';
import type { RegistryView } from '../../extension-points/view.js';
import type { ExtensionModule } from '../../modules/simple/types.js';
import type { BaseRuntime } from '../../runtime/types.js';
import { createLifecycleRuntime, type LifecycleRuntime } from './runtime.js';
import type { LifecycleSignature } from './types.js';

export type LifecycleModule = ExtensionModule<
	LifecycleSignature,
	LifecycleRuntime
>;

const lifecycleExtensionPoint = createExtensionPoint<LifecycleSignature>({
	onUnload: true,
});

function createLifecycleCompiler(): Compiler<
	LifecycleSignature,
	LifecycleRuntime
> {
	return {
		async compile<ContextRuntime extends BaseRuntime>(
			registry: RegistryView<LifecycleSignature, ContextRuntime>,
		): Promise<LifecycleRuntime> {
			const unloads = registry.argsFor('onUnload').map(([unload]) => unload);
			return createLifecycleRuntime(unloads);
		},
	};
}

export function createLifecycleModule(): LifecycleModule {
	return {
		extensionPoint: lifecycleExtensionPoint,
		compiler: createLifecycleCompiler(),
	};
}
