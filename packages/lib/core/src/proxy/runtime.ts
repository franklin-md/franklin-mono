import type {
	MethodHandler,
	NotificationHandler,
	EventHandler,
	Transport,
} from './types.js';

// TODO: Feels like this is not right.
// Connect should actually return the ProxyRuntime + a dispose function.
// Internally this comues out to the same flow,
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

export interface ServerRuntime {
	registerNamespace(key: string): ServerRuntime;

	registerMethod?(handler: MethodHandler): () => void;

	registerNotification?(handler: NotificationHandler): () => void;

	registerEvent?(handler: EventHandler): () => void;

	// TODO: rename to registerTransport when stream() descriptor is renamed
	registerTransport?(transport: Transport): () => void;

	registerResource?(lifecycle: ResourceLifecycle): ServerResourceBinding;
}

export interface ProxyRuntime {
	bindNamespace(key: string): ProxyRuntime;

	bindMethod?(): MethodHandler;

	bindNotification?(): NotificationHandler;

	bindEvent?(): EventHandler;

	bindTransport?(): Transport;

	bindResource?(): ResourceBinding;
}
