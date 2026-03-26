import type { InferNamespaceValue } from './infer.js';
import type {
	Descriptor,
	EventDescriptor,
	MethodDescriptor,
	NamespaceDescriptor,
	NotificationDescriptor,
	ResourceDescriptor,
	ResourceInnerDescriptor,
	StreamDescriptor,
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
type StreamLike<TRead = unknown, TWrite = TRead> = {
	readonly readable: ReadableStream<TRead>;
	readonly writable: WritableStream<TWrite>;
	readonly close: () => Promise<void>;
};
type DisposableLike = { dispose(): Promise<void> };
type StripDisposable<T> = T extends DisposableLike ? Omit<T, 'dispose'> : T;

type HasNeverMember<TShape> =
	true extends {
		[K in keyof TShape]: [TShape[K]] extends [never] ? true : false;
	}[keyof TShape]
		? true
		: false;

type NamespaceObjectDescriptor<T extends object> =
	HasNeverMember<NamespaceShape<T>> extends true
		? never
		: NamespaceDescriptor<T, NamespaceShape<T>>;

type ResourceMethodDescriptor<TArgs extends unknown[], TResult> =
	TResult extends StreamLike<infer TRead, infer TWrite>
		? ResourceDescriptor<TArgs, StreamDescriptor<TRead, TWrite>>
		: StripDisposable<TResult> extends infer TInner
			? TInner extends object
				? NamespaceObjectDescriptor<TInner> extends infer TDescriptor
					? TDescriptor extends NamespaceDescriptor<any, any>
						? ResourceDescriptor<TArgs, TDescriptor>
						: never
					: never
				: never
			: never;

type NamespaceMemberDescriptor<T> =
	T extends (...args: infer A) => AsyncIterable<infer I>
		? EventDescriptor<A, I>
		: T extends (...args: infer A) => Promise<void>
			? MethodDescriptor<A, void> | NotificationDescriptor<A>
			: T extends (...args: infer A) => Promise<infer R>
				? MethodDescriptor<A, R> | ResourceMethodDescriptor<A, R>
				: T extends object
					? NamespaceObjectDescriptor<T>
					: never;

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

export type NamespaceShape<T> = {
	[K in keyof T]: NamespaceMemberDescriptor<T[K]>;
};

export function namespace<TShape extends Record<string, Descriptor>>(
	shape: TShape,
): NamespaceDescriptor<InferNamespaceValue<TShape>, TShape>;
export function namespace<T>(
	shape: NamespaceShape<T>,
): NamespaceDescriptor<T, NamespaceShape<T>>;
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
