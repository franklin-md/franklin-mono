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
		// Dispose is delegated entirely to the server via handle.dispose() (the
		// kill RPC). The server is responsible for tearing down both the
		// implementation resource and its lease-scoped IPC handlers. We only need
		// idempotency on the client side to guard against double-dispose.
		let disposePromise: Promise<void> | null = null;
		return Object.assign(inner as object, {
			dispose: () => {
				disposePromise ??= handle.dispose();
				return disposePromise;
			},
		});
	};
}
