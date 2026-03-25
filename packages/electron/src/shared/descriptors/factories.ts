import type { Duplex } from '@franklin/transport';

import type {
	Descriptor,
	InferProxyType,
	MethodDescriptor,
	MethodOptions,
	ProxyDescriptor,
	ProxyShape,
	TransportDescriptor,
} from './types.js';
import {
	METHOD_DESCRIPTOR,
	PROXY_DESCRIPTOR,
	TRANSPORT_DESCRIPTOR,
} from './types.js';

type AnyAsyncMethod = (...args: any[]) => Promise<any>;
type AnyAsyncTransport = (...args: any[]) => Promise<Duplex<any, any>>;

export function method<TMethod extends AnyAsyncMethod>(
	options?: MethodOptions,
): MethodDescriptor<Parameters<TMethod>, Awaited<ReturnType<TMethod>>> {
	return {
		kind: METHOD_DESCRIPTOR,
		returns: options?.returns,
	};
}

export function transport<
	TMethod extends AnyAsyncTransport,
>(): TransportDescriptor<Parameters<TMethod>, Awaited<ReturnType<TMethod>>> {
	return {
		kind: TRANSPORT_DESCRIPTOR,
	};
}

export function proxy<T>(shape: ProxyShape<T>): ProxyDescriptor<T>;
export function proxy<TShape extends Record<string, Descriptor>>(
	shape: TShape,
): ProxyDescriptor<InferProxyType<TShape>>;
export function proxy(shape: Record<string, Descriptor>): ProxyDescriptor<any> {
	return {
		kind: PROXY_DESCRIPTOR,
		shape,
	};
}
