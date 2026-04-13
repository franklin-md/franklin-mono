import type { Descriptor } from '../../descriptors/types/index.js';
import type {
	NamespaceDescriptor,
	ResourceDescriptor,
} from '../../descriptors/types/index.js';
import { descriptorKind } from '../../descriptors/kind.js';
import type { ServerRuntime } from '../../runtime.js';
import type { EventHandler } from '../../types.js';
import type { NotificationHandler } from '../../types.js';
import type { MethodHandler } from '../../types.js';
import type { ProxyType } from '../../types.js';
import type { ResourceContext } from '../context.js';
import { requireCapability } from '../require.js';
import { bindNamespace } from './namespace.js';
import { bindResource } from './resource.js';

export function bindServer<D extends Descriptor>(
	descriptor: D,
	impl: ProxyType<D>,
	runtime: ServerRuntime,
): { dispose(): Promise<void> } {
	const contexts: ResourceContext[] = [];
	const unregister = bindNode(
		descriptor,
		impl as unknown,
		undefined,
		runtime,
		contexts,
	);
	return {
		async dispose() {
			for (const fn of unregister) fn();
			await Promise.allSettled(contexts.map((c) => c.dispose()));
		},
	};
}

/**
 * Walk the descriptor tree and register handlers on the runtime.
 *
 * At each level we carry the current implementation `value` and its `parent`
 * (for preserving `this`-binding on method calls). Namespace traversal
 * advances both cursors: the value descends into `value[key]` and the
 * runtime descends via `runtime.registerNamespace(key)`.
 */
export function bindNode(
	descriptor: Descriptor,
	value: unknown,
	parent: unknown,
	runtime: ServerRuntime,
	contexts: ResourceContext[],
): Array<() => void> {
	switch (descriptorKind(descriptor)) {
		case 'method':
			return [
				requireCapability(
					runtime,
					'registerMethod',
					'method',
				)(async (...args: unknown[]) => {
					return await (value as MethodHandler).call(parent, ...args);
				}),
			];
		case 'notification':
			return [
				requireCapability(
					runtime,
					'registerNotification',
					'notification',
				)(async (...args: unknown[]) => {
					await (value as NotificationHandler).call(parent, ...args);
				}),
			];
		case 'event':
			return [
				requireCapability(
					runtime,
					'registerEvent',
					'event',
				)((...args: unknown[]) => {
					return (value as EventHandler).call(parent, ...args);
				}),
			];
		case 'stream':
			return [requireCapability(runtime, 'registerTransport', 'stream')(value)];
		case 'namespace':
			return bindNamespace(
				descriptor as NamespaceDescriptor<any, any>,
				value,
				runtime,
				contexts,
			);
		case 'resource':
			return bindResource(
				descriptor as ResourceDescriptor<any, any>,
				value,
				parent,
				runtime,
				contexts,
			);
	}
}
