import type { ResourceDescriptor } from './descriptors/types.js';

export interface ProxyRuntime {
	bindMethod?(path: string[]): (...args: unknown[]) => Promise<unknown>;

	bindNotification?(path: string[]): (...args: unknown[]) => Promise<void>;

	bindEvent?(path: string[]): (...args: unknown[]) => AsyncIterable<unknown>;

	bindStream?(path: string[]): unknown;

	bindNamespace?(
		path: string[],
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
		handler: (...args: unknown[]) => Promise<unknown>,
	): () => void;

	registerNotification?(
		path: string[],
		handler: (...args: unknown[]) => Promise<void>,
	): () => void;

	registerEvent?(
		path: string[],
		handler: (...args: unknown[]) => AsyncIterable<unknown>,
	): () => void;

	registerStream?(path: string[], factory: () => unknown): () => void;

	registerResource?(
		path: string[],
		descriptor: ResourceDescriptor<any, any>,
		factory: (...args: unknown[]) => Promise<unknown>,
	): Array<() => void>;
}
