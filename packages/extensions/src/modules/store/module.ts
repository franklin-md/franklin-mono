import { createExtensionPoint } from '../../algebra/extension-points/create.js';
import type { ExtensionModule } from '../../algebra/modules/simple/index.js';
import type { StoreSignature } from './api/api.js';
import type { StoreRegistry } from './api/registry/index.js';
import type { StoreMapping } from './api/registry/mapping.js';
import { createStoreCompiler } from './compile/compiler.js';
import type { StoreRuntime } from './runtime.js';

export type StoreModule = ExtensionModule<StoreSignature, StoreRuntime>;

const storeExtensionPoint = createExtensionPoint<StoreSignature>({
	registerStore: true,
});

export function createStoreModule(
	registry: StoreRegistry,
	mapping: StoreMapping = {},
): StoreModule {
	return {
		extensionPoint: storeExtensionPoint,
		compiler: createStoreCompiler(registry, mapping),
	};
}
