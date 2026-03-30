export const EVENT_KIND = Symbol('proxy.event');

export interface EventDescriptor<
	_TArgs extends unknown[] = unknown[],
	_TItem = unknown,
> {
	readonly kind: typeof EVENT_KIND;
}

