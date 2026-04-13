import type {
	MethodHandler,
	NotificationHandler,
	EventHandler,
	Transport,
} from './types.js';
import type { ResourceBinding, ResourceFactory } from './resource.js';

export interface ServerRuntime {
	registerNamespace(key: string): ServerRuntime;

	registerMethod?(handler: MethodHandler): () => void;

	registerNotification?(handler: NotificationHandler): () => void;

	registerEvent?(handler: EventHandler): () => void;

	// TODO: rename to registerTransport when stream() descriptor is renamed
	registerTransport?(transport: Transport): () => void;

	registerResource?(factory: ResourceFactory): () => Promise<void>;
}

export interface ProxyRuntime {
	bindNamespace(key: string): ProxyRuntime;

	bindMethod?(): MethodHandler;

	bindNotification?(): NotificationHandler;

	bindEvent?(): EventHandler;

	bindTransport?(): Transport;

	bindResource?(): ResourceBinding;
}
