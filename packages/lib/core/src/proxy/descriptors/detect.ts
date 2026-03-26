import type {
	EventDescriptor,
	MethodDescriptor,
	NamespaceDescriptor,
	NotificationDescriptor,
	ResourceDescriptor,
	StreamDescriptor,
} from './types.js';
import {
	EVENT_KIND,
	METHOD_KIND,
	NAMESPACE_KIND,
	NOTIFICATION_KIND,
	RESOURCE_KIND,
	STREAM_KIND,
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
	descriptor: unknown,
): descriptor is MethodDescriptor<any, any> {
	return hasKind(descriptor, METHOD_KIND);
}

export function isNotificationDescriptor(
	descriptor: unknown,
): descriptor is NotificationDescriptor<any> {
	return hasKind(descriptor, NOTIFICATION_KIND);
}

export function isEventDescriptor(
	descriptor: unknown,
): descriptor is EventDescriptor<any, any> {
	return hasKind(descriptor, EVENT_KIND);
}

export function isStreamDescriptor(
	descriptor: unknown,
): descriptor is StreamDescriptor<any, any> {
	return hasKind(descriptor, STREAM_KIND);
}

export function isNamespaceDescriptor(
	descriptor: unknown,
): descriptor is NamespaceDescriptor<any, any> {
	return hasKind(descriptor, NAMESPACE_KIND);
}

export function isResourceDescriptor(
	descriptor: unknown,
): descriptor is ResourceDescriptor<any, any> {
	return hasKind(descriptor, RESOURCE_KIND);
}
