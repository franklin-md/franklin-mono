import {
	isEventDescriptor,
	isMethodDescriptor,
	isNamespaceDescriptor,
	isNotificationDescriptor,
	isResourceDescriptor,
	isStreamDescriptor,
} from './descriptors/detect.js';
import type { AnyShape, Descriptor } from './descriptors/types.js';
import type { ProxyType } from './types.js';
import type { ServerRuntime } from './runtime.js';
import { getValueAtPath } from './lookup.js';
import { UnsupportedDescriptorError } from './bind-client.js';

export function bindServer<D extends Descriptor>(
	descriptor: D,
	impl: ProxyType<D>,
	runtime: ServerRuntime,
): { dispose(): void } {
	const unregister = registerDescriptor(descriptor, [], impl, runtime);
	return {
		dispose() {
			for (const fn of unregister) fn();
		},
	};
}

function registerDescriptor(
	descriptor: Descriptor,
	path: string[],
	impl: unknown,
	runtime: ServerRuntime,
): Array<() => void> {
	if (isMethodDescriptor(descriptor)) {
		if (!runtime.registerMethod) {
			throw new UnsupportedDescriptorError('method', path);
		}
		const handler = getValueAtPath(impl, path) as (
			...args: unknown[]
		) => Promise<unknown>;
		return [runtime.registerMethod(path, descriptor, handler)];
	}

	if (isNotificationDescriptor(descriptor)) {
		if (!runtime.registerNotification) {
			throw new UnsupportedDescriptorError('notification', path);
		}
		const handler = getValueAtPath(impl, path) as (
			...args: unknown[]
		) => Promise<void>;
		return [runtime.registerNotification(path, descriptor, handler)];
	}

	if (isEventDescriptor(descriptor)) {
		if (!runtime.registerEvent) {
			throw new UnsupportedDescriptorError('event', path);
		}
		const handler = getValueAtPath(impl, path) as (
			...args: unknown[]
		) => AsyncIterable<unknown>;
		return [runtime.registerEvent(path, descriptor, handler)];
	}

	if (isStreamDescriptor(descriptor)) {
		if (!runtime.registerStream) {
			throw new UnsupportedDescriptorError('stream', path);
		}
		const factory = getValueAtPath(impl, path) as () => unknown;
		return [runtime.registerStream(path, descriptor, factory)];
	}

	if (isNamespaceDescriptor(descriptor)) {
		return registerNamespace(descriptor.shape as AnyShape, path, impl, runtime);
	}

	if (isResourceDescriptor(descriptor)) {
		if (!runtime.registerResource) {
			throw new UnsupportedDescriptorError('resource', path);
		}
		const factory = getValueAtPath(impl, path) as (
			...args: unknown[]
		) => Promise<unknown>;
		return runtime.registerResource(path, descriptor, factory);
	}

	throw new Error(`Unknown descriptor at path: ${path.join('.')}`);
}

function registerNamespace(
	shape: AnyShape,
	path: string[],
	impl: unknown,
	runtime: ServerRuntime,
): Array<() => void> {
	const unregister: Array<() => void> = [];

	for (const key of Object.keys(shape)) {
		const descriptor = shape[key];
		if (!descriptor) continue;
		unregister.push(
			...registerDescriptor(descriptor, [...path, key], impl, runtime),
		);
	}

	return unregister;
}
