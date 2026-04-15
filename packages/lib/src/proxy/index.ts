export {
	// Kind symbols
	METHOD_KIND,
	NOTIFICATION_KIND,
	EVENT_KIND,
	ON_KIND,
	STREAM_KIND,
	NAMESPACE_KIND,
	RESOURCE_KIND,
	// Factories
	method,
	notification,
	event,
	on,
	stream,
	namespace,
	resource,
	// Type guards
	isMethodDescriptor,
	isNotificationDescriptor,
	isEventDescriptor,
	isOnDescriptor,
	isStreamDescriptor,
	isNamespaceDescriptor,
	isResourceDescriptor,
} from './descriptors/index.js';
export type {
	// Descriptor types
	MethodDescriptor,
	NotificationDescriptor,
	EventDescriptor,
	OnDescriptor,
	StreamDescriptor,
	NamespaceDescriptor,
	NamespaceShape,
	ResourceDescriptor,
	ResourceInnerDescriptor,
	Descriptor,
	AnyShape,
} from './descriptors/index.js';

export type { ProxyType } from './types.js';
export type { ProxyRuntime, ServerRuntime } from './runtime.js';
export type {
	ResourceBinding,
	ResourceFactory,
	ResourceInstance,
} from './resource.js';
export type {
	MethodHandler,
	NotificationHandler,
	EventHandler,
	OnHandler,
	Transport,
} from './types.js';
export { bindClient } from './bind/client/index.js';
export { bindServer } from './bind/server/index.js';
export { UnsupportedDescriptorError } from './bind/error.js';
