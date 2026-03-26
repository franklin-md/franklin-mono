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

export function namespace<TShape extends Record<string, Descriptor>>(
	shape: TShape,
): NamespaceDescriptor<InferNamespaceValue<TShape>, TShape> {
	return { kind: NAMESPACE_KIND, shape };
}

export function resource<
	TArgs extends unknown[],
	TInner extends ResourceInnerDescriptor,
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
	shape: AnyShape,
): HandleDescriptor<Parameters<TMethod>, Awaited<ReturnType<TMethod>>> {
	return resource(namespace(shape));
}

// Type-level inference for namespace values (D -> I)
type InferNamespaceValue<TShape extends Record<string, Descriptor>> = {
	[K in keyof TShape]: InferDescriptorValue<TShape[K]>;
};

type InferDescriptorValue<TDesc extends Descriptor> =
	TDesc extends MethodDescriptor<infer TArgs, infer TResult>
		? (...args: TArgs) => Promise<TResult>
		: TDesc extends NotificationDescriptor<infer TArgs>
			? (...args: TArgs) => Promise<void>
			: TDesc extends EventDescriptor<infer TArgs, infer TItem>
				? (...args: TArgs) => AsyncIterable<TItem>
				: TDesc extends NamespaceDescriptor<infer TValue, any>
					? TValue
					: TDesc extends ResourceDescriptor<infer TArgs, infer TInner>
						? (...args: TArgs) => Promise<InferResourceInnerValue<TInner>>
						: never;

type InferResourceInnerValue<TInner extends ResourceInnerDescriptor> =
	TInner extends StreamDescriptor<infer R, infer W>
		? { readable: ReadableStream<R>; writable: WritableStream<W> }
		: TInner extends NamespaceDescriptor<infer TValue, any>
			? TValue
			: never;
