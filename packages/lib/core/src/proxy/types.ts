import type {
	Descriptor,
	EventDescriptor,
	MethodDescriptor,
	NamespaceDescriptor,
	NotificationDescriptor,
	ResourceDescriptor,
	StreamDescriptor,
} from './descriptors/types/index.js';

/**
 * The core D -> I type function.
 * Maps a descriptor to the runtime type it produces.
 */
export type ProxyType<D extends Descriptor> =
	D extends MethodDescriptor<infer TArgs, infer TResult>
		? MethodHandler<TArgs, TResult>
		: // TODO: I think Notification may just get delted (as its a method of void and is fire and foreget only if the caller doesn't bother awaiting)
			D extends NotificationDescriptor<infer TArgs>
			? NotificationHandler<TArgs>
			: D extends EventDescriptor<infer TArgs, infer TItem>
				? EventHandler<TArgs, TItem>
				: D extends StreamDescriptor<infer R, infer W>
					? Transport<R, W>
					: D extends NamespaceDescriptor<unknown, infer TShape>
						? { [K in keyof TShape]: ProxyType<TShape[K]> }
						: D extends ResourceDescriptor<infer TArgs, infer TInner>
							? (...args: TArgs) => Promise<
									ProxyType<TInner extends Descriptor ? TInner : never> & {
										dispose(): Promise<void>;
									}
								>
							: never;

// TODO: move these into types.ts and have the ProxyType in terms of these
// TODO: These should be generic but default to unknown
// TODO: we should use these elsewhere in the typing of Proxy and Impl etc

export type MethodHandler<
	TArgs extends unknown[] = unknown[],
	TResult = unknown,
> = (...args: TArgs) => Promise<TResult>;
export type NotificationHandler<TArgs extends unknown[] = unknown[]> = (
	...args: TArgs
) => Promise<void>;
export type EventHandler<
	TArgs extends unknown[] = unknown[],
	TItem = unknown,
> = (...args: TArgs) => AsyncIterable<TItem>;
export type Transport<TRead = unknown, TWrite = TRead> = {
	readable: ReadableStream<TRead>;
	writable: WritableStream<TWrite>;
};
