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
import type { ResourceHandle, ServerRuntime } from '../runtime.js';
import { UnsupportedDescriptorError } from './client.js';
import type { ResourceContext } from './context.js';
import { createResourceContext } from './context.js';

export function bindServer<D extends Descriptor>(
	descriptor: D,
	impl: ProxyType<D>,
	runtime: ServerRuntime,
): { dispose(): Promise<void> } {
	const contexts: ResourceContext[] = [];
	const unregister = registerDescriptor(
		descriptor,
		[],
		impl,
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

function createHandle(factory: (...args: unknown[]) => Promise<unknown>): {
	handle: ResourceHandle;
	context: ResourceContext;
} {
	const context = createResourceContext();
	const hooks: Array<(id: string, value: unknown) => void> = [];

	const handle: ResourceHandle = {
		async connect(...args: unknown[]) {
			const id = await context.create(factory, ...args);
			const value = context.get(id);
			for (const hook of hooks) hook(id, value);
			return id;
		},
		kill: (id: string) => context.kill(id),
		get: (id: string) => context.get(id),
		onConnect(hook: (id: string, value: unknown) => void) {
			hooks.push(hook);
			return () => {
				const idx = hooks.indexOf(hook);
				if (idx >= 0) hooks.splice(idx, 1);
			};
		},
	};

	return { handle, context };
}

/**
 * Walk the descriptor tree and register handlers on the runtime.
 *
 * `impl` is the resolved value at the current level -- for leaf descriptors
 * it IS the handler. For namespace it's the object containing child handlers.
 * For resource inner descriptors, `impl` is undefined because the actual
 * values are created by the factory at connect time; the resource runtime
 * handles dispatch internally.
 */
function registerDescriptor(
	descriptor: Descriptor,
	path: string[],
	impl: unknown,
	runtime: ServerRuntime,
	contexts: Array<{ dispose(): Promise<void> }>,
): Array<() => void> {
	if (isMethodDescriptor(descriptor)) {
		if (!runtime.registerMethod) {
			throw new UnsupportedDescriptorError('method', path);
		}
		return [
			runtime.registerMethod(
				path,
				impl as (...args: unknown[]) => Promise<unknown>,
			),
		];
	}

	if (isNotificationDescriptor(descriptor)) {
		if (!runtime.registerNotification) {
			throw new UnsupportedDescriptorError('notification', path);
		}
		return [
			runtime.registerNotification(
				path,
				impl as (...args: unknown[]) => Promise<void>,
			),
		];
	}

	if (isEventDescriptor(descriptor)) {
		if (!runtime.registerEvent) {
			throw new UnsupportedDescriptorError('event', path);
		}
		return [
			runtime.registerEvent(
				path,
				impl as (...args: unknown[]) => AsyncIterable<unknown>,
			),
		];
	}

	if (isStreamDescriptor(descriptor)) {
		if (!runtime.registerStream) {
			throw new UnsupportedDescriptorError('stream', path);
		}
		return [runtime.registerStream(path, impl as () => unknown)];
	}

	if (isNamespaceDescriptor(descriptor)) {
		const shape = descriptor.shape as AnyShape;
		const implObj = impl as Record<string, unknown> | undefined;
		const unregister: Array<() => void> = [];
		for (const key of Object.keys(shape)) {
			const child = shape[key];
			if (!child) continue;
			unregister.push(
				...registerDescriptor(
					child,
					[...path, key],
					implObj?.[key],
					runtime,
					contexts,
				),
			);
		}
		return unregister;
	}

	if (isResourceDescriptor(descriptor)) {
		if (!runtime.registerResource) {
			throw new UnsupportedDescriptorError('resource', path);
		}
		const factory = impl as (...args: unknown[]) => Promise<unknown>;
		const { handle, context } = createHandle(factory);
		contexts.push(context);
		const binding = runtime.registerResource(path, handle);
		const innerRuntime = binding.inner();
		const innerUnregister = registerDescriptor(
			descriptor.inner as Descriptor,
			[],
			undefined,
			innerRuntime,
			contexts,
		);
		return [...binding.unregister, ...innerUnregister];
	}

	throw new Error(`Unknown descriptor at path: ${path.join('.')}`);
}
