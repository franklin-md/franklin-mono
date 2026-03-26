import type { Duplex } from '@franklin/transport';

import type {
	Descriptor,
	DuplexDescriptor,
	HandleDescriptor,
	HandleMemberDescriptor,
	HandleShape,
	InferProxyType,
	LeaseDescriptor,
	LeaseInnerDescriptor,
	MethodDescriptor,
	ProxyDescriptor,
	ProxyShape,
	TransportDescriptor,
} from './types.js';
import {
	DUPLEX_DESCRIPTOR,
	LEASE_DESCRIPTOR,
	METHOD_DESCRIPTOR,
	PROXY_DESCRIPTOR,
} from './types.js';

type AnyAsyncMethod = (...args: any[]) => Promise<any>;
type AnyAsyncTransport = (...args: any[]) => Promise<Duplex<any, any>>;

export function method<TMethod extends AnyAsyncMethod>(): MethodDescriptor<
	Parameters<TMethod>,
	Awaited<ReturnType<TMethod>>
> {
	return {
		kind: METHOD_DESCRIPTOR,
	};
}

export function duplex<
	TValue extends Duplex<any, any> = Duplex<unknown, unknown>,
>(): DuplexDescriptor<TValue> {
	return {
		kind: DUPLEX_DESCRIPTOR,
	};
}

export function lease<
	TMethod extends AnyAsyncMethod,
	TInner extends LeaseInnerDescriptor,
>(inner: TInner): LeaseDescriptor<Parameters<TMethod>, TInner>;
export function lease<TArgs extends unknown[], TInner extends LeaseInnerDescriptor>(
	inner: TInner,
): LeaseDescriptor<TArgs, TInner>;
export function lease(
	inner: LeaseInnerDescriptor,
): LeaseDescriptor<any, LeaseInnerDescriptor> {
	return {
		kind: LEASE_DESCRIPTOR,
		inner,
	};
}

export function transport<
	TMethod extends AnyAsyncTransport,
>(): TransportDescriptor<Parameters<TMethod>, Awaited<ReturnType<TMethod>>> {
	return lease<Parameters<TMethod>, DuplexDescriptor<Awaited<ReturnType<TMethod>>>>(
		duplex<Awaited<ReturnType<TMethod>>>(),
	);
}

export function handle<TMethod extends AnyAsyncMethod>(
	shape: HandleShape<Awaited<ReturnType<TMethod>>>,
): HandleDescriptor<
	Parameters<TMethod>,
	Awaited<ReturnType<TMethod>>,
	HandleShape<Awaited<ReturnType<TMethod>>>
>;
export function handle<
	TArgs extends unknown[],
	TValue,
	TShape extends Record<string, HandleMemberDescriptor>,
>(shape: TShape): HandleDescriptor<TArgs, TValue, TShape>;
export function handle(
	shape: Record<string, HandleMemberDescriptor>,
): HandleDescriptor<any, any, any> {
	return lease(proxy(shape));
}

export function proxy<T>(
	shape: ProxyShape<T>,
): ProxyDescriptor<T, ProxyShape<T>>;
export function proxy<TShape extends Record<string, Descriptor>>(
	shape: TShape,
): ProxyDescriptor<InferProxyType<TShape>, TShape>;
export function proxy(shape: Record<string, Descriptor>): ProxyDescriptor<any> {
	return {
		kind: PROXY_DESCRIPTOR,
		shape,
	};
}
