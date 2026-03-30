import type { AnyShape } from './descriptor.js';
import type { EventDescriptor } from './event.js';
import type { MethodDescriptor } from './method.js';
import type { NotificationDescriptor } from './notification.js';
import type { ResourceDescriptor, StripDisposable } from './resource.js';
import type { StreamDescriptor, StreamLike } from './stream.js';

export const NAMESPACE_KIND = Symbol('proxy.namespace');

export interface NamespaceDescriptor<
	_TValue = unknown,
	TShape extends AnyShape = AnyShape,
> {
	readonly kind: typeof NAMESPACE_KIND;
	readonly shape: TShape;
}

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

type NamespaceMemberDescriptor<T> = T extends (
	...args: infer A
) => AsyncIterable<infer I>
	? EventDescriptor<A, I>
	: T extends (...args: infer A) => Promise<void>
		? MethodDescriptor<A, void> | NotificationDescriptor<A>
		: T extends (...args: infer A) => Promise<infer R>
			? MethodDescriptor<A, R> | ResourceMethodDescriptor<A, R>
			: T extends object
				? NamespaceObjectDescriptor<T>
				: never;

export type NamespaceShape<T> = {
	[K in keyof T]: NamespaceMemberDescriptor<T[K]>;
};

type HasNeverMember<TShape> = true extends {
	[K in keyof TShape]: [TShape[K]] extends [never] ? true : false;
}[keyof TShape]
	? true
	: false;
