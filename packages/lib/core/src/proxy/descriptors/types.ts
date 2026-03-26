export const METHOD_KIND = Symbol('proxy.method');
export const NOTIFICATION_KIND = Symbol('proxy.notification');
export const EVENT_KIND = Symbol('proxy.event');
export const STREAM_KIND = Symbol('proxy.stream');
export const NAMESPACE_KIND = Symbol('proxy.namespace');
export const RESOURCE_KIND = Symbol('proxy.resource');

export interface MethodDescriptor<
	_TArgs extends unknown[] = unknown[],
	_TResult = unknown,
> {
	readonly kind: typeof METHOD_KIND;
}

export interface NotificationDescriptor<_TArgs extends unknown[] = unknown[]> {
	readonly kind: typeof NOTIFICATION_KIND;
}

export interface EventDescriptor<
	_TArgs extends unknown[] = unknown[],
	_TItem = unknown,
> {
	readonly kind: typeof EVENT_KIND;
}

export interface StreamDescriptor<TRead = unknown, _TWrite = TRead> {
	readonly kind: typeof STREAM_KIND;
}

export interface NamespaceDescriptor<
	_TValue = unknown,
	TShape extends AnyShape = AnyShape,
> {
	readonly kind: typeof NAMESPACE_KIND;
	readonly shape: TShape;
}

export type ResourceInnerDescriptor =
	| StreamDescriptor<any, any>
	| NamespaceDescriptor<any, any>;

export interface ResourceDescriptor<
	_TArgs extends unknown[] = unknown[],
	TInner extends ResourceInnerDescriptor = ResourceInnerDescriptor,
> {
	readonly kind: typeof RESOURCE_KIND;
	readonly inner: TInner;
}

export type Descriptor =
	| MethodDescriptor<any, any>
	| NotificationDescriptor<any>
	| EventDescriptor<any, any>
	| StreamDescriptor<any, any>
	| NamespaceDescriptor<any, any>
	| ResourceDescriptor<any, any>;

export type AnyShape = Record<string, Descriptor>;
