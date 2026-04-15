export const METHOD_KIND = Symbol('proxy.method');

export interface MethodDescriptor<
	_TArgs extends unknown[] = unknown[],
	_TResult = unknown,
> {
	readonly kind: typeof METHOD_KIND;
}
