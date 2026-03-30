import type { NamespaceDescriptor } from './namespace.js';
import type { StreamDescriptor } from './stream.js';

export const RESOURCE_KIND = Symbol('proxy.resource');

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

export type DisposableLike = { dispose(): Promise<void> };
export type StripDisposable<T> = T extends DisposableLike ? Omit<T, 'dispose'> : T;

