import type { Duplex } from '@franklin/transport';

type AnyAsyncMethod = (...args: any[]) => Promise<any>;
type AnyAsyncTransport = (...args: any[]) => Promise<Duplex<any, any>>;

export const METHOD_DESCRIPTOR = Symbol('franklin.ipc.method');
export const LEASE_DESCRIPTOR = Symbol('franklin.ipc.lease');
export const DUPLEX_DESCRIPTOR = Symbol('franklin.ipc.duplex');
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

export interface DuplexDescriptor<
	TValue extends Duplex<any, any> = Duplex<unknown, unknown>,
> {
	readonly kind: typeof DUPLEX_DESCRIPTOR;
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

export type LeaseInnerDescriptor =
	| DuplexDescriptor<any>
	| ProxyDescriptor<any, any>;

export interface LeaseDescriptor<
	TArgs extends unknown[] = unknown[],
	TInner extends LeaseInnerDescriptor = LeaseInnerDescriptor,
> {
	readonly kind: typeof LEASE_DESCRIPTOR;
	readonly inner: TInner;
}

export type TransportDescriptor<
	TArgs extends unknown[] = unknown[],
	TResult extends Duplex<any, any> = Duplex<unknown, unknown>,
> = LeaseDescriptor<TArgs, DuplexDescriptor<TResult>>;

export type HandleDescriptor<
	TArgs extends unknown[] = unknown[],
	TValue = unknown,
	TShape extends Record<string, HandleMemberDescriptor> = Record<
		string,
		HandleMemberDescriptor
	>,
> = LeaseDescriptor<TArgs, ProxyDescriptor<TValue, TShape>>;

export type Descriptor =
	| MethodDescriptor<any, any>
	| LeaseDescriptor<any, any>
	| ProxyDescriptor<any, any>;

type LeaseInnerValue<TDescriptor extends LeaseInnerDescriptor> =
	TDescriptor extends DuplexDescriptor<infer TValue>
		? TValue
		: TDescriptor extends ProxyDescriptor<infer TValue, any>
			? TValue
			: never;

type DescriptorValue<TDescriptor extends Descriptor | LeaseInnerDescriptor> =
	TDescriptor extends MethodDescriptor<infer TArgs, infer TResult>
		? (...args: TArgs) => Promise<TResult>
		: TDescriptor extends LeaseDescriptor<infer TArgs, infer TInner>
			? (...args: TArgs) => Promise<LeaseInnerValue<TInner>>
			: TDescriptor extends ProxyDescriptor<infer TValue, any>
				? TValue
				: TDescriptor extends DuplexDescriptor<infer TValue>
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
