export {
	METHOD_KIND,
	NOTIFICATION_KIND,
	EVENT_KIND,
	ON_KIND,
	STREAM_KIND,
	NAMESPACE_KIND,
	RESOURCE_KIND,
} from './types/index.js';
export type {
	MethodDescriptor,
	NotificationDescriptor,
	EventDescriptor,
	OnDescriptor,
	StreamDescriptor,
	NamespaceDescriptor,
	ResourceDescriptor,
	ResourceInnerDescriptor,
	Descriptor,
	AnyShape,
} from './types/index.js';
export {
	method,
	notification,
	event,
	on,
	stream,
	namespace,
	resource,
} from './factories/index.js';
export type { NamespaceShape } from './factories/index.js';
export {
	isMethodDescriptor,
	isNotificationDescriptor,
	isEventDescriptor,
	isOnDescriptor,
	isStreamDescriptor,
	isNamespaceDescriptor,
	isResourceDescriptor,
} from './detect.js';
export { descriptorKind } from './kind.js';
export type { DescriptorKind } from './kind.js';
