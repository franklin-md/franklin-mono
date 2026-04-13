export {
	METHOD_KIND,
	NOTIFICATION_KIND,
	EVENT_KIND,
	STREAM_KIND,
	NAMESPACE_KIND,
	RESOURCE_KIND,
} from './types/index.js';
export type {
	MethodDescriptor,
	NotificationDescriptor,
	EventDescriptor,
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
	stream,
	namespace,
	resource,
} from './factories/index.js';
export type { NamespaceShape } from './factories/index.js';
export {
	isMethodDescriptor,
	isNotificationDescriptor,
	isEventDescriptor,
	isStreamDescriptor,
	isNamespaceDescriptor,
	isResourceDescriptor,
} from './detect.js';
export { descriptorKind } from './kind.js';
export type { DescriptorKind } from './kind.js';
