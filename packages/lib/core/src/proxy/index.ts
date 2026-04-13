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
	NamespaceShape,
	ResourceDescriptor,
	ResourceInnerDescriptor,
	Descriptor,
	AnyShape,
} from './descriptors/index.js';

export type { ProxyType } from './types.js';
export type {
	ProxyRuntime,
	ServerRuntime,
	ResourceBinding,
	ServerResourceBinding,
	ResourceLifecycle,
	MethodHandler,
	NotificationHandler,
	EventHandler,
} from './runtime.js';
export { bindClient } from './bind/client/index.js';
export { bindServer } from './bind/server/index.js';
export { UnsupportedDescriptorError } from './bind/error.js';
