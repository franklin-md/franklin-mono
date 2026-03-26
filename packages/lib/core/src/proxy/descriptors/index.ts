export {
	METHOD_KIND,
	NOTIFICATION_KIND,
	EVENT_KIND,
	STREAM_KIND,
	NAMESPACE_KIND,
	RESOURCE_KIND,
} from './types.js';
export type {
	MethodDescriptor,
	NotificationDescriptor,
	EventDescriptor,
	StreamDescriptor,
	NamespaceDescriptor,
	ResourceDescriptor,
	ResourceInnerDescriptor,
	TransportDescriptor,
	HandleDescriptor,
	Descriptor,
	AnyShape,
} from './types.js';
export {
	method,
	notification,
	event,
	stream,
	namespace,
	resource,
	transport,
	handle,
} from './factories.js';
export {
	isMethodDescriptor,
	isNotificationDescriptor,
	isEventDescriptor,
	isStreamDescriptor,
	isNamespaceDescriptor,
	isResourceDescriptor,
	isTransportDescriptor,
	isHandleDescriptor,
} from './detect.js';
