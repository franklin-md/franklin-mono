import type {
	EventDescriptor,
	MethodDescriptor,
	NamespaceDescriptor,
	NotificationDescriptor,
	ResourceDescriptor,
	StreamDescriptor,
} from './descriptors/types.js';

export interface ProxyRuntime {
	bindMethod?(
		path: string[],
		descriptor: MethodDescriptor<any, any>,
	): (...args: unknown[]) => Promise<unknown>;

	bindNotification?(
		path: string[],
		descriptor: NotificationDescriptor<any>,
	): (...args: unknown[]) => Promise<void>;

	bindEvent?(
		path: string[],
		descriptor: EventDescriptor<any, any>,
	): (...args: unknown[]) => AsyncIterable<unknown>;

	bindStream?(path: string[], descriptor: StreamDescriptor<any, any>): unknown;

	bindNamespace?(
		path: string[],
		descriptor: NamespaceDescriptor<any, any>,
		buildMembers: () => Record<string, unknown>,
	): Record<string, unknown>;

	bindResource?(
		path: string[],
		descriptor: ResourceDescriptor<any, any>,
	): (...args: unknown[]) => Promise<unknown>;
}

export interface ServerRuntime {
	registerMethod?(
		path: string[],
		descriptor: MethodDescriptor<any, any>,
		handler: (...args: unknown[]) => Promise<unknown>,
	): () => void;

	registerNotification?(
		path: string[],
		descriptor: NotificationDescriptor<any>,
		handler: (...args: unknown[]) => Promise<void>,
	): () => void;

	registerEvent?(
		path: string[],
		descriptor: EventDescriptor<any, any>,
		handler: (...args: unknown[]) => AsyncIterable<unknown>,
	): () => void;

	registerStream?(
		path: string[],
		descriptor: StreamDescriptor<any, any>,
		factory: () => unknown,
	): () => void;

	registerResource?(
		path: string[],
		descriptor: ResourceDescriptor<any, any>,
		factory: (...args: unknown[]) => Promise<unknown>,
	): Array<() => void>;
}
