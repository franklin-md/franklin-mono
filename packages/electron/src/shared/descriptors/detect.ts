import type {
	Descriptor,
	DuplexDescriptor,
	HandleDescriptor,
	LeaseDescriptor,
	LeaseInnerDescriptor,
	MethodDescriptor,
	ProxyDescriptor,
	TransportDescriptor,
} from './types.js';
import {
	DUPLEX_DESCRIPTOR,
	LEASE_DESCRIPTOR,
	METHOD_DESCRIPTOR,
	PROXY_DESCRIPTOR,
} from './types.js';

function hasKind(descriptor: unknown, kind: symbol): boolean {
	return (
		typeof descriptor === 'object' &&
		descriptor !== null &&
		'kind' in descriptor &&
		(descriptor as { kind: symbol }).kind === kind
	);
}

export function isMethodDescriptor(
	descriptor: Descriptor | LeaseInnerDescriptor | unknown,
): descriptor is MethodDescriptor<any, any> {
	return hasKind(descriptor, METHOD_DESCRIPTOR);
}

export function isLeaseDescriptor(
	descriptor: Descriptor | unknown,
): descriptor is LeaseDescriptor<any, any> {
	return hasKind(descriptor, LEASE_DESCRIPTOR);
}

export function isDuplexDescriptor(
	descriptor: LeaseInnerDescriptor | unknown,
): descriptor is DuplexDescriptor<any> {
	return hasKind(descriptor, DUPLEX_DESCRIPTOR);
}

export function isProxyDescriptor(
	descriptor: Descriptor | LeaseInnerDescriptor | unknown,
): descriptor is ProxyDescriptor<any, any> {
	return hasKind(descriptor, PROXY_DESCRIPTOR);
}

export function isTransportDescriptor(
	descriptor: Descriptor | unknown,
): descriptor is TransportDescriptor<any, any> {
	return isLeaseDescriptor(descriptor) && isDuplexDescriptor(descriptor.inner);
}

export function isHandleDescriptor(
	descriptor: Descriptor | unknown,
): descriptor is HandleDescriptor<any, any, any> {
	return isLeaseDescriptor(descriptor) && isProxyDescriptor(descriptor.inner);
}
