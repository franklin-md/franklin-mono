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
import type { ProxyRuntime } from '../runtime.js';

export function bindClient<D extends Descriptor>(
	descriptor: D,
	runtime: ProxyRuntime,
): ProxyType<D> {
	return buildDescriptor(descriptor, [], runtime) as ProxyType<D>;
}

function buildDescriptor(
	descriptor: Descriptor,
	path: string[],
	runtime: ProxyRuntime,
): unknown {
	if (isMethodDescriptor(descriptor)) {
		if (!runtime.bindMethod) {
			throw new UnsupportedDescriptorError('method', path);
		}
		return runtime.bindMethod(path);
	}

	if (isNotificationDescriptor(descriptor)) {
		if (!runtime.bindNotification) {
			throw new UnsupportedDescriptorError('notification', path);
		}
		return runtime.bindNotification(path);
	}

	if (isEventDescriptor(descriptor)) {
		if (!runtime.bindEvent) {
			throw new UnsupportedDescriptorError('event', path);
		}
		return runtime.bindEvent(path);
	}

	if (isStreamDescriptor(descriptor)) {
		if (!runtime.bindStream) {
			throw new UnsupportedDescriptorError('stream', path);
		}
		return runtime.bindStream(path);
	}

	if (isNamespaceDescriptor(descriptor)) {
		const shape = descriptor.shape as AnyShape;
		const result: Record<string, unknown> = {};
		for (const key of Object.keys(shape)) {
			const child = shape[key];
			if (!child) continue;
			result[key] = buildDescriptor(child, [...path, key], runtime);
		}
		return result;
	}

	if (isResourceDescriptor(descriptor)) {
		if (!runtime.bindResource) {
			throw new UnsupportedDescriptorError('resource', path);
		}
		const binding = runtime.bindResource(path);
		return async (...args: unknown[]) => {
			const id = await binding.connect(...args);
			const innerRuntime = binding.inner(id);
			const inner = buildDescriptor(
				descriptor.inner as Descriptor,
				[],
				innerRuntime,
			);
			return Object.assign(inner as object, {
				dispose: async () => {
					await binding.kill(id);
				},
			});
		};
	}

	throw new Error(`Unknown descriptor at path: ${path.join('.')}`);
}

export class UnsupportedDescriptorError extends Error {
	constructor(kind: string, path: string[]) {
		super(
			`Runtime does not support "${kind}" descriptors (at ${path.join('.')})`,
		);
		this.name = 'UnsupportedDescriptorError';
	}
}
