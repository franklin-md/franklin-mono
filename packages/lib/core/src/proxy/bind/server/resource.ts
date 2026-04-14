import type {
	Descriptor,
	DisposableLike,
	ResourceDescriptor,
} from '../../descriptors/types/index.js';
import type { ResourceFactory } from '../../resource.js';
import type { MethodHandler } from '../../types.js';
import type { ServerRuntime } from '../../runtime.js';
import { requireCapability } from '../require.js';
import { bindNode } from './index.js';

export function bindResource(
	descriptor: ResourceDescriptor<any, any>,
	value: unknown,
	parent: unknown,
	runtime: ServerRuntime,
): Array<() => void | Promise<void>> {
	const registerResource = requireCapability(
		runtime,
		'registerResource',
		'resource',
	);

	const factory: ResourceFactory = async (...args: unknown[]) => {
		const instance = await (value as MethodHandler).call(parent, ...args);
		const disposable = instance as DisposableLike;
		return {
			bind(innerRuntime: ServerRuntime) {
				return bindNode(
					descriptor.inner as Descriptor,
					instance,
					undefined,
					innerRuntime,
				);
			},
			dispose:
				typeof disposable.dispose === 'function'
					? () => disposable.dispose()
					: async () => {},
		};
	};

	const dispose = registerResource(factory);
	return [dispose];
}
