export type { AbsolutePath } from './paths/index.js';
export { toAbsolutePath, joinAbsolute } from './paths/index.js';
export type { FileStat, Filesystem } from './filesystem/index.js';
export type { Terminal, TerminalInput } from './terminal/index.js';
export type {
	NetworkPermissions,
	WebFetchRequest,
	WebFetchResponse,
} from './network/index.js';
export {
	createFolderScopedFilesystem,
	createFilteredFilesystem,
} from './filesystem/index.js';
export type { FilesystemPermissions } from './filesystem/index.js';
export type { Persister } from './persistence/persister.js';
export { createFilePersistence } from './persistence/file-persister.js';
export { DebouncedPersister } from './persistence/debounced-persister.js';
export { Debouncer } from './utils/debouncer.js';
export { createObserver } from './utils/observer.js';
export type { Observer } from './utils/observer.js';
export type { DeepPartial } from './typing/deep-partial.js';
export {
	normalizeUrl,
	isPrivateHost,
	isLoopbackHost,
	parseIPv4,
	normalizeHost,
	matchesDomain,
	matchesUrlPattern,
} from './network/utils.js';
export type { Simplify } from './typing/simplify.js';

// Proxy algebra
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
} from './proxy/index.js';
export type {
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
} from './proxy/index.js';
export type { ProxyType } from './proxy/index.js';
export type {
	ProxyRuntime,
	ServerRuntime,
	ResourceBinding,
	ResourceFactory,
	ResourceInstance,
	MethodHandler,
	NotificationHandler,
	EventHandler,
	OnHandler,
	Transport,
} from './proxy/index.js';
export { bindClient, UnsupportedDescriptorError } from './proxy/index.js';
export { bindServer } from './proxy/index.js';
export { wait } from './utils/async/wait.js';
export { randomDelay } from './utils/random.js';
