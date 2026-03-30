export type { FileStat, Filesystem } from './filesystem/index.js';
export {
	createFolderScopedFilesystem,
	createFilteredFilesystem,
} from './filesystem/index.js';
export type { FilesystemFilter } from './filesystem/index.js';
export type { Persister } from './persistence/persister.js';
export { createFilePersistence } from './persistence/file-persister.js';
export { DebouncedPersister } from './persistence/debounced-persister.js';
export { Debouncer } from './utils/debouncer.js';

// Proxy algebra
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
} from './proxy/index.js';
export type {
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
} from './proxy/index.js';
export type { ProxyType } from './proxy/index.js';
export type { ProxyRuntime, ServerRuntime } from './proxy/index.js';
export { bindClient, UnsupportedDescriptorError } from './proxy/index.js';
export { bindServer } from './proxy/index.js';
export { getValueAtPath } from './proxy/index.js';
