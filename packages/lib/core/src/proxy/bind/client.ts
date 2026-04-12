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
	return buildDescriptor(descriptor, runtime) as ProxyType<D>;
}

function buildDescriptor(
	descriptor: Descriptor,
	runtime: ProxyRuntime,
): unknown {
	if (isMethodDescriptor(descriptor)) {
		if (!runtime.bindMethod) {
			throw new UnsupportedDescriptorError('method');
		}
		return runtime.bindMethod();
	}

	if (isNotificationDescriptor(descriptor)) {
		if (!runtime.bindNotification) {
			throw new UnsupportedDescriptorError('notification');
		}
		return runtime.bindNotification();
	}

	if (isEventDescriptor(descriptor)) {
		if (!runtime.bindEvent) {
			throw new UnsupportedDescriptorError('event');
		}
		return runtime.bindEvent();
	}

	if (isStreamDescriptor(descriptor)) {
		if (!runtime.bindStream) {
			throw new UnsupportedDescriptorError('stream');
		}
		return runtime.bindStream();
	}

	if (isNamespaceDescriptor(descriptor)) {
		const shape = descriptor.shape as AnyShape;
		const result: Record<string, unknown> = {};
		for (const key of Object.keys(shape)) {
			const child = shape[key];
			if (!child) continue;
			result[key] = buildDescriptor(child, runtime.bindNamespace(key));
		}
		return result;
	}

	if (isResourceDescriptor(descriptor)) {
		if (!runtime.bindResource) {
			throw new UnsupportedDescriptorError('resource');
		}
		const binding = runtime.bindResource();
		return async (...args: unknown[]) => {
			const id = await binding.connect(...args);
			const innerRuntime = binding.inner(id);
			const inner = buildDescriptor(
				descriptor.inner as Descriptor,
				innerRuntime,
			);
			return Object.assign(inner as object, {
				dispose: async () => {
					await binding.kill(id);
				},
			});
		};
	}

	throw new Error('Unknown descriptor kind');
}

export class UnsupportedDescriptorError extends Error {
	constructor(kind: string) {
		super(`Runtime does not support "${kind}" descriptors`);
		this.name = 'UnsupportedDescriptorError';
	}
}
