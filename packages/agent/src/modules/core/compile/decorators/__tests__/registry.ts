import {
	createApi,
	createExtensionPoint,
	createRegistry,
	createRegistryView,
	type API,
	type BaseRuntime,
	type RegistryView,
} from '@franklin/extensibility';
import type { CoreSignature } from '../../../api/api.js';

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
): RegistryView<CoreSignature, Runtime> {
	const { registry, writer } = createRegistry<CoreSignature, Runtime>();
	const api = createApi<CoreSignature, Runtime>(coreExtensionPoint, writer);
	configure?.(api);
	return createRegistryView(registry);
}
