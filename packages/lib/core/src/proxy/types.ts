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
		? (...args: TArgs) => Promise<TResult>
		: // TODO: I think Notification may just get delted (as its a method of void and is fire and foreget only if the caller doesn't bother awaiting)
			D extends NotificationDescriptor<infer TArgs>
			? (...args: TArgs) => Promise<void>
			: D extends EventDescriptor<infer TArgs, infer TItem>
				? (...args: TArgs) => AsyncIterable<TItem>
				: D extends StreamDescriptor<infer R, infer W>
					? {
							readable: ReadableStream<R>;
							writable: WritableStream<W>;
							close: () => Promise<void>;
						}
					: D extends NamespaceDescriptor<unknown, infer TShape>
						? { [K in keyof TShape]: ProxyType<TShape[K]> }
						: D extends ResourceDescriptor<infer TArgs, infer TInner>
							? (...args: TArgs) => Promise<
									ProxyType<TInner extends Descriptor ? TInner : never> & {
										dispose(): Promise<void>;
									}
								>
							: never;
