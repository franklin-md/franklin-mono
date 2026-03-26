import type {
	Descriptor,
	HandleDescriptor,
	MethodDescriptor,
	ProxyDescriptor,
	TransportDescriptor,
} from './types.js';
import {
	HANDLE_DESCRIPTOR,
	METHOD_DESCRIPTOR,
	PROXY_DESCRIPTOR,
	TRANSPORT_DESCRIPTOR,
} from './types.js';

export function isMethodDescriptor(
	descriptor: Descriptor,
): descriptor is MethodDescriptor<any, any> {
	return descriptor.kind === METHOD_DESCRIPTOR;
}

export function isTransportDescriptor(
	descriptor: Descriptor,
): descriptor is TransportDescriptor<any, any> {
	return descriptor.kind === TRANSPORT_DESCRIPTOR;
}

export function isHandleDescriptor(
	descriptor: Descriptor,
): descriptor is HandleDescriptor<any, any, any> {
	return descriptor.kind === HANDLE_DESCRIPTOR;
}

export function isProxyDescriptor(
	descriptor: Descriptor,
): descriptor is ProxyDescriptor<any, any> {
	return descriptor.kind === PROXY_DESCRIPTOR;
}
