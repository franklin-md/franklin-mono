export interface ResourceBinding {
	connect(...args: unknown[]): Promise<string>;
	kill(id: string): Promise<void>;
	inner(id: string): ProxyRuntime;
}

export interface ServerResourceBinding {
	readonly unregister: Array<() => void>;
	inner(): ServerRuntime;
}

export interface ResourceHandle {
	connect(...args: unknown[]): Promise<string>;
	kill(id: string): Promise<void>;
	get(id: string): unknown;
	onConnect(hook: (id: string, value: unknown) => void): () => void;
}

export interface ProxyRuntime {
	bindMethod?(path: string[]): (...args: unknown[]) => Promise<unknown>;

	bindNotification?(path: string[]): (...args: unknown[]) => Promise<void>;

	bindEvent?(path: string[]): (...args: unknown[]) => AsyncIterable<unknown>;

	bindStream?(path: string[]): unknown;

	bindResource?(path: string[]): ResourceBinding;
}

export interface ServerRuntime {
	registerMethod?(path: string[], handler?: MethodHandler): () => void;

	registerNotification?(
		path: string[],
		handler?: NotificationHandler,
	): () => void;

	registerEvent?(path: string[], handler?: EventHandler): () => void;

	// TODO: factory should be (...args: unknown[]) => Duplex<R, W>
	registerStream?(path: string[], factory?: StreamFactory): () => void;

	registerResource?(
		path: string[],
		handle: ResourceHandle,
	): ServerResourceBinding;
}

export type MethodHandler = (...args: unknown[]) => Promise<unknown>;
export type NotificationHandler = (...args: unknown[]) => Promise<void>;
export type EventHandler = (...args: unknown[]) => AsyncIterable<unknown>;
export type StreamFactory = () => unknown;
