import type { Descriptor } from '../../descriptors/types/index.js';
import type { ResourceDescriptor } from '../../descriptors/types/index.js';
import type { ProxyRuntime } from '../../runtime.js';
import { requireCapability } from '../require.js';
import { buildDescriptor } from './index.js';

export function buildResource(
	descriptor: ResourceDescriptor<any, any>,
	runtime: ProxyRuntime,
): (...args: unknown[]) => Promise<unknown> {
	const binding = requireCapability(runtime, 'bindResource', 'resource')();
	return async (...args: unknown[]) => {
		const handle = await binding(...args);
		const inner = buildDescriptor(descriptor.inner as Descriptor, handle);
		return Object.assign(inner as object, {
			dispose: () => handle.dispose(),
		});
	};
}
