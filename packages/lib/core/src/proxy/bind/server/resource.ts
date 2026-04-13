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

// TODO(FRA-156): Remove once Duplex.close is renamed to dispose
type CloseableLike = { close(): Promise<void> };

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
		const closeable = instance as CloseableLike;
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
					: typeof closeable.close === 'function'
						? () => closeable.close()
						: async () => {},
		};
	};

	const dispose = registerResource(factory);
	return [dispose];
}
