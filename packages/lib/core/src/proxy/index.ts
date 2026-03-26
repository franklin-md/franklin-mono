export {
	// Kind symbols
	METHOD_KIND,
	NOTIFICATION_KIND,
	EVENT_KIND,
	STREAM_KIND,
	NAMESPACE_KIND,
	RESOURCE_KIND,
	// Factories
	method,
	notification,
	event,
	stream,
	namespace,
	resource,
	// Type guards
	isMethodDescriptor,
	isNotificationDescriptor,
	isEventDescriptor,
	isStreamDescriptor,
	isNamespaceDescriptor,
	isResourceDescriptor,
} from './descriptors/index.js';
export type {
	// Descriptor types
	MethodDescriptor,
	NotificationDescriptor,
	EventDescriptor,
	StreamDescriptor,
	NamespaceDescriptor,
	ResourceDescriptor,
	ResourceInnerDescriptor,
	Descriptor,
	AnyShape,
} from './descriptors/index.js';

export type { ProxyType } from './types.js';
export type { ProxyRuntime, ServerRuntime } from './runtime.js';
export { bindClient, UnsupportedDescriptorError } from './bind-client.js';
export { bindServer } from './bind-server.js';
export { getValueAtPath } from './lookup.js';
