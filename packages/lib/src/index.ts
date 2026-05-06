export type { AbsolutePath } from './paths/index.js';
export {
	getFilename,
	getFilenameExtension,
	toAbsolutePath,
	joinAbsolute,
} from './paths/index.js';
export type { FileStat, Filesystem } from './filesystem/index.js';
export type { Process, ProcessInput, ProcessOutput } from './process/index.js';
export type {
	PlatformName,
	ShellFamily,
	ShellInfo,
	OsInfo,
	MemoryOsInfoValues,
} from './os-info/index.js';
export { detectShellFamily, MemoryOsInfo } from './os-info/index.js';
export type {
	NetworkPermissions,
	WebFetchMethod,
	WebFetchRequest,
	WebFetchResponse,
	Fetch,
	FetchDecorator,
	FetchBuilder,
	WebAPI,
} from './network/index.js';
export type {
	ListenLoopbackOptions,
	LoopbackListener,
	LoopbackRequest,
	LoopbackResponse,
} from './network/loopback/types.js';
export type {
	EmittedLoopbackRequest,
	MemoryLoopbackListenerOptions,
} from './network/loopback/memory.js';
export { MemoryLoopbackListener } from './network/loopback/memory.js';
export {
	decorate,
	withOnlyHTTP,
	withPolicy,
	assertAllowed,
	withUserAgent,
	getHeader,
	setHeader,
	withTimeout,
	withRedirect,
	withRetry,
	readBodyWithLimit,
} from './network/index.js';
export type { RetryOptions } from './network/index.js';
export {
	createFolderScopedFilesystem,
	createFilteredFilesystem,
	createObservableFilesystem,
	FILESYSTEM_ALLOW_ALL,
	FILESYSTEM_DEFAULT_PERMISSIONS,
	FILESYSTEM_DENY_ALL,
	MemoryFilesystem,
} from './filesystem/index.js';
export type {
	FilesystemObservables,
	FilesystemPermissions,
	ObservableFilesystem,
	WriteListener,
} from './filesystem/index.js';
export type {
	Codec,
	DecodeIssue,
	DecodeResult,
} from './persistence/codec/types.js';
export { rawCodec } from './persistence/codec/raw.js';
export { zodCodec } from './persistence/codec/zod.js';
export { versioned } from './persistence/codec/versioned.js';
export type { Issue } from './persistence/issue/types.js';
export { hydrateFailedIssue } from './persistence/issue/factory.js';
export type { RestoreResult } from './persistence/types.js';
export type {
	SingleFilePersister,
	SingleLoadResult,
} from './persistence/single/types.js';
export { createSingleFilePersister } from './persistence/single/create.js';
export type {
	MapFilePersister,
	MapLoadResult,
} from './persistence/map/types.js';
export { createMapFilePersister } from './persistence/map/create.js';
export { DebouncedPersister } from './persistence/map/debounced.js';
export { Debouncer } from './utils/debouncer.js';
export { formatElapsed } from './utils/format-elapsed.js';
export { oxfordJoin } from './utils/oxford-join.js';
export { createObserver } from './utils/observer.js';
export type { Observer } from './utils/observer.js';
export type { DeepPartial } from './typing/deep-partial.js';
export type { AssertNoOverlap, OverlappingKeys } from './typing/overlap.js';
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
export type {
	Apply,
	ApplyFold,
	Fold,
	FoldRight,
	HKT,
} from './typing/hkt/index.js';

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
export { withDeadline } from './utils/async/deadline.js';
export { randomDelay } from './utils/random.js';
export { encode, decode } from './utils/bytes.js';
export { base64url, base64urlToBase64, hex } from './utils/encoding.js';
export { randomBytes } from './crypto/seed.js';
export type { PkceParams } from './crypto/pkce.js';
export { generatePkceParams } from './crypto/pkce.js';
export { truncate, truncateStream } from './utils/truncate.js';
export type {
	TruncateResult,
	TruncateStreamOptions,
} from './utils/truncate.js';
