import type { Descriptor } from '../../descriptors/types/index.js';
import type {
	NamespaceDescriptor,
	ResourceDescriptor,
} from '../../descriptors/types/index.js';
import { descriptorKind } from '../../descriptors/kind.js';
import type { ProxyRuntime } from '../../runtime.js';
import type { ProxyType } from '../../types.js';
import { requireCapability } from '../require.js';
import { buildNamespace } from './namespace.js';
import { buildResource } from './resource.js';

export function bindClient<D extends Descriptor>(
	descriptor: D,
	runtime: ProxyRuntime,
): ProxyType<D> {
	return buildDescriptor(descriptor, runtime) as ProxyType<D>;
}

export function buildDescriptor(
	descriptor: Descriptor,
	runtime: ProxyRuntime,
): unknown {
	switch (descriptorKind(descriptor)) {
		case 'method':
			return requireCapability(runtime, 'bindMethod', 'method')();
		case 'notification':
			return requireCapability(runtime, 'bindNotification', 'notification')();
		case 'event':
			return requireCapability(runtime, 'bindEvent', 'event')();
		case 'stream':
			return requireCapability(runtime, 'bindTransport', 'stream')();
		case 'namespace':
			return buildNamespace(
				descriptor as NamespaceDescriptor<any, any>,
				runtime,
			);
		case 'resource':
			return buildResource(descriptor as ResourceDescriptor<any, any>, runtime);
	}
}
