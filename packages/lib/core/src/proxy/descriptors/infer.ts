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

export type InferNamespaceValue<TShape extends Record<string, Descriptor>> = {
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
