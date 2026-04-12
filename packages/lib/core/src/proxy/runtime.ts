export interface ResourceBinding {
	connect(...args: unknown[]): Promise<string>;
	kill(id: string): Promise<void>;
	inner(id: string): ProxyRuntime;
}

export interface ServerResourceBinding {
	readonly unregister: Array<() => void>;
	create(id: string): ServerRuntime;
}

export interface ResourceLifecycle {
	connect(...args: unknown[]): Promise<string>;
	kill(id: string): Promise<void>;
}

export interface ProxyRuntime {
	bindNamespace(key: string): ProxyRuntime;

	bindMethod?(): MethodHandler;

	bindNotification?(): NotificationHandler;

	bindEvent?(): EventHandler;

	bindStream?(): unknown;

	bindResource?(): ResourceBinding;
}

export interface ServerRuntime {
	registerNamespace(key: string): ServerRuntime;

	registerMethod?(handler: MethodHandler): () => void;

	registerNotification?(handler: NotificationHandler): () => void;

	registerEvent?(handler: EventHandler): () => void;

	// TODO: rename to registerTransport when stream() descriptor is renamed
	registerStream?(transport: unknown): () => void;

	registerResource?(lifecycle: ResourceLifecycle): ServerResourceBinding;
}

// TODO: move these into types.ts and have the ProxyType in terms of these
// TODO: These should be generic but default to unknown
// TODO: we should use these elsewhere in the typing of Proxy and Impl etc
export type MethodHandler = (...args: unknown[]) => Promise<unknown>;
export type NotificationHandler = (...args: unknown[]) => Promise<void>;
export type EventHandler = (...args: unknown[]) => AsyncIterable<unknown>;
