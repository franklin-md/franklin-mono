export const ON_KIND = Symbol('proxy.on');

export interface OnDescriptor<_TData = unknown> {
	readonly kind: typeof ON_KIND;
}
