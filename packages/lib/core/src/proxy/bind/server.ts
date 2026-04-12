import {
	isEventDescriptor,
	isMethodDescriptor,
	isNamespaceDescriptor,
	isNotificationDescriptor,
	isResourceDescriptor,
	isStreamDescriptor,
} from '../descriptors/detect.js';
import type { AnyShape, Descriptor } from '../descriptors/types/index.js';
import type { ProxyType } from '../types.js';
import type {
	EventHandler,
	MethodHandler,
	NotificationHandler,
	ResourceLifecycle,
	ServerResourceBinding,
	ServerRuntime,
} from '../runtime.js';
import { UnsupportedDescriptorError } from './client.js';
import type { ResourceContext } from './context.js';
import { createResourceContext } from './context.js';

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
function bindNode(
	descriptor: Descriptor,
	value: unknown,
	parent: unknown,
	runtime: ServerRuntime,
	contexts: ResourceContext[],
): Array<() => void> {
	if (isMethodDescriptor(descriptor)) {
		if (!runtime.registerMethod) {
			throw new UnsupportedDescriptorError('method');
		}
		return [
			runtime.registerMethod(async (...args: unknown[]) => {
				return await (value as MethodHandler).call(parent, ...args);
			}),
		];
	}

	if (isNotificationDescriptor(descriptor)) {
		if (!runtime.registerNotification) {
			throw new UnsupportedDescriptorError('notification');
		}
		return [
			runtime.registerNotification(async (...args: unknown[]) => {
				await (value as NotificationHandler).call(parent, ...args);
			}),
		];
	}

	if (isEventDescriptor(descriptor)) {
		if (!runtime.registerEvent) {
			throw new UnsupportedDescriptorError('event');
		}
		return [
			runtime.registerEvent((...args: unknown[]) => {
				return (value as EventHandler).call(parent, ...args);
			}),
		];
	}

	if (isStreamDescriptor(descriptor)) {
		if (!runtime.registerStream) {
			throw new UnsupportedDescriptorError('stream');
		}
		return [runtime.registerStream(value)];
	}

	if (isNamespaceDescriptor(descriptor)) {
		const shape = descriptor.shape as AnyShape;
		const unregister: Array<() => void> = [];
		for (const key of Object.keys(shape)) {
			const child = shape[key];
			if (!child) continue;
			const childRuntime = runtime.registerNamespace(key);
			const childValue = (value as Record<string, unknown>)[key];
			unregister.push(
				...bindNode(child, childValue, value, childRuntime, contexts),
			);
		}
		return unregister;
	}

	if (isResourceDescriptor(descriptor)) {
		if (!runtime.registerResource) {
			throw new UnsupportedDescriptorError('resource');
		}
		const resourceContext = createResourceContext();
		contexts.push(resourceContext);

		// Mutable ref allows lifecycle.connect to capture the transport
		// binding before registerResource returns (connect is only called
		// asynchronously, so the ref is guaranteed to be populated).
		const ref: { binding: ServerResourceBinding | null } = { binding: null };

		const lifecycle: ResourceLifecycle = {
			async connect(...args: unknown[]): Promise<string> {
				const id = crypto.randomUUID();
				const instance = await (value as MethodHandler).call(parent, ...args);
				// Deferred binding: bind inner descriptor per-instance
				if (!ref.binding) {
					throw new Error('Resource binding not initialized');
				}
				const innerRuntime = ref.binding.create(id);
				const innerUnregister = bindNode(
					descriptor.inner as Descriptor,
					instance,
					undefined,
					innerRuntime,
					contexts,
				);
				resourceContext.store(id, instance, () => {
					for (const fn of innerUnregister) fn();
				});
				return id;
			},
			kill: (id: string) => resourceContext.kill(id),
		};

		ref.binding = runtime.registerResource(lifecycle);
		return [...ref.binding.unregister];
	}

	throw new Error('Unknown descriptor kind');
}
