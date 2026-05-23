import {
	createApi,
	createExtensionPoint,
	createRegistry,
	createRegistryView,
	type API,
	type BaseRuntime,
} from '@franklin/extensibility';
import type { CoreSignature } from '../../../api/api.js';
import {
	createCoreRegistry as createBoundCoreRegistry,
	type CoreRegistry,
} from '../../registrations/index.js';

const coreExtensionPoint = createExtensionPoint<CoreSignature>({
	on: true,
	registerTool: true,
});

export function createTestRuntime(): BaseRuntime {
	return {
		dispose: async () => {},
	};
}

export function createCoreRegistry<Runtime extends BaseRuntime>(
	configure?: (api: API<CoreSignature, Runtime>) => void,
	getRuntime: () => Runtime = createTestRuntime as () => Runtime,
): CoreRegistry {
	const { registry, writer } = createRegistry<CoreSignature, Runtime>();
	const api = createApi<CoreSignature, Runtime>(coreExtensionPoint, writer);
	configure?.(api);
	return createBoundCoreRegistry(createRegistryView(registry), getRuntime);
}
