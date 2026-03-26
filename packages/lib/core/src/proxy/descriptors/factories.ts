import type { InferNamespaceValue } from './infer.js';
import type {
	AnyShape,
	Descriptor,
	EventDescriptor,
	HandleDescriptor,
	MethodDescriptor,
	NamespaceDescriptor,
	NotificationDescriptor,
	ResourceDescriptor,
	ResourceInnerDescriptor,
	StreamDescriptor,
	TransportDescriptor,
} from './types.js';
import {
	EVENT_KIND,
	METHOD_KIND,
	NAMESPACE_KIND,
	NOTIFICATION_KIND,
	RESOURCE_KIND,
	STREAM_KIND,
} from './types.js';

type AnyAsyncMethod = (...args: any[]) => Promise<any>;
type AnyNotificationMethod = (...args: any[]) => Promise<void>;
type AnyEventMethod = (...args: any[]) => AsyncIterable<any>;
type HandleShape<T> = {
	[K in keyof T]: T[K] extends AnyAsyncMethod
		? MethodDescriptor<Parameters<T[K]>, Awaited<ReturnType<T[K]>>>
		: T[K] extends object
			? NamespaceDescriptor<T[K], HandleShape<T[K]>>
			: never;
};

export function method<TMethod extends AnyAsyncMethod>(): MethodDescriptor<
	Parameters<TMethod>,
	Awaited<ReturnType<TMethod>>
> {
	return { kind: METHOD_KIND };
}

export function notification<
	TMethod extends AnyNotificationMethod,
>(): NotificationDescriptor<Parameters<TMethod>> {
	return { kind: NOTIFICATION_KIND };
}

export function event<TMethod extends AnyEventMethod>(): EventDescriptor<
	Parameters<TMethod>,
	Awaited<ReturnType<TMethod>> extends AsyncIterable<infer TItem>
		? TItem
		: never
> {
	return { kind: EVENT_KIND };
}

export function stream<TRead = unknown, TWrite = TRead>(): StreamDescriptor<
	TRead,
	TWrite
> {
	return { kind: STREAM_KIND };
}

type NamespaceShape<T> = {
	[K in keyof T]: T[K] extends (...args: infer A) => AsyncIterable<infer I>
		? EventDescriptor<A, I>
		: T[K] extends (...args: infer A) => Promise<void>
			? MethodDescriptor<A, void> | NotificationDescriptor<A>
			: T[K] extends (...args: infer A) => Promise<infer R>
				? MethodDescriptor<A, R>
				: T[K] extends object
					? NamespaceDescriptor<T[K], NamespaceShape<T[K]>>
					: never;
};

export function namespace<T>(
	shape: NamespaceShape<T>,
): NamespaceDescriptor<T, NamespaceShape<T>>;
export function namespace<TShape extends Record<string, Descriptor>>(
	shape: TShape,
): NamespaceDescriptor<InferNamespaceValue<TShape>, TShape>;
export function namespace(
	shape: Record<string, Descriptor>,
): NamespaceDescriptor<any, any> {
	return { kind: NAMESPACE_KIND, shape };
}

export function resource<
	TArgs extends unknown[],
	TInner extends ResourceInnerDescriptor = ResourceInnerDescriptor,
>(inner: TInner): ResourceDescriptor<TArgs, TInner> {
	return { kind: RESOURCE_KIND, inner };
}

// Convenience: resource(stream()) — lease over a bidirectional duplex
export function transport<
	TMethod extends (...args: any[]) => Promise<any>,
>(): TransportDescriptor<
	Parameters<TMethod>,
	Awaited<ReturnType<TMethod>> extends { readable: ReadableStream<infer R> }
		? R
		: unknown,
	Awaited<ReturnType<TMethod>> extends { writable: WritableStream<infer W> }
		? W
		: unknown
> {
	return resource(stream());
}

// Convenience: resource(namespace(shape)) — lease over a proxy object
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
	TShape extends AnyShape,
>(shape: TShape): HandleDescriptor<TArgs, TValue, TShape>;
export function handle(shape: AnyShape): HandleDescriptor<any, any> {
	return resource(namespace(shape));
}
