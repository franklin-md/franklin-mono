import type { Duplex } from '@franklin/transport';

type AnyAsyncMethod = (...args: any[]) => Promise<any>;
type AnyAsyncTransport = (...args: any[]) => Promise<Duplex<any, any>>;

export const METHOD_DESCRIPTOR = Symbol('franklin.ipc.method');
export const TRANSPORT_DESCRIPTOR = Symbol('franklin.ipc.transport');
export const HANDLE_DESCRIPTOR = Symbol('franklin.ipc.handle');
export const PROXY_DESCRIPTOR = Symbol('franklin.ipc.proxy');

/**
 * Describes how to serialize/deserialize a proxy return value.
 * `true` marks a callable leaf (call to serialize, wrap as function to deserialize).
 * Nested objects describe recursive structure.
 */
export interface ResultShape {
	[key: string]: ResultShape | true;
}

export interface MethodDescriptor<
	TArgs extends unknown[] = unknown[],
	TResult = unknown,
> {
	readonly kind: typeof METHOD_DESCRIPTOR;
	readonly returns?: ResultShape;
}

export interface TransportDescriptor<
	TArgs extends unknown[] = unknown[],
	TResult extends Duplex<any, any> = Duplex<unknown, unknown>,
> {
	readonly kind: typeof TRANSPORT_DESCRIPTOR;
}

export interface ProxyDescriptor<
	TValue,
	TShape extends Record<string, Descriptor> = Record<string, Descriptor>,
> {
	readonly kind: typeof PROXY_DESCRIPTOR;
	readonly shape: TShape;
}

export type HandleMemberDescriptor =
	| MethodDescriptor<any, any>
	| ProxyDescriptor<any, any>;

export interface HandleDescriptor<
	TArgs extends unknown[] = unknown[],
	TValue = unknown,
	TShape extends Record<string, HandleMemberDescriptor> = Record<
		string,
		HandleMemberDescriptor
	>,
> {
	readonly kind: typeof HANDLE_DESCRIPTOR;
	readonly shape: TShape;
}

export type Descriptor =
	| MethodDescriptor<any, any>
	| TransportDescriptor<any, any>
	| HandleDescriptor<any, any, any>
	| ProxyDescriptor<any, any>;

type DescriptorValue<TDescriptor extends Descriptor> =
	TDescriptor extends MethodDescriptor<infer TArgs, infer TResult>
		? (...args: TArgs) => Promise<TResult>
		: TDescriptor extends TransportDescriptor<infer TArgs, infer TResult>
			? (...args: TArgs) => Promise<TResult>
			: TDescriptor extends HandleDescriptor<infer TArgs, infer TValue, any>
				? (...args: TArgs) => Promise<TValue>
				: TDescriptor extends ProxyDescriptor<infer TValue, any>
					? TValue
					: never;

export type InferProxyType<TShape extends Record<string, Descriptor>> = {
	[K in keyof TShape]: DescriptorValue<TShape[K]>;
};

export type ProxyValue<TDescriptor extends ProxyDescriptor<any, any>> =
	TDescriptor extends ProxyDescriptor<infer TValue, any> ? TValue : never;

export type ProxyShape<T> = {
	[K in keyof T]: T[K] extends AnyAsyncTransport
		? TransportDescriptor<Parameters<T[K]>, Awaited<ReturnType<T[K]>>>
		: T[K] extends AnyAsyncMethod
			? MethodDescriptor<Parameters<T[K]>, Awaited<ReturnType<T[K]>>>
			: ProxyDescriptor<T[K], any>;
};

export type HandleShape<T> = {
	[K in keyof T]: T[K] extends AnyAsyncMethod
		? MethodDescriptor<Parameters<T[K]>, Awaited<ReturnType<T[K]>>>
		: ProxyDescriptor<T[K], any>;
};

export interface MethodOptions {
	returns?: ResultShape;
}
