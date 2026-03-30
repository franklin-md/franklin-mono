import type {
	AnyShape,
	Descriptor,
	MethodDescriptor,
	NamespaceDescriptor,
	ResourceDescriptor,
	ResourceInnerDescriptor,
	StreamDescriptor,
} from '@franklin/lib/proxy';

export interface IpcStreamObserver<T = unknown> {
	next: (packet: T) => void;
	close: () => void;
}

export type IpcStreamMessage<T = unknown> =
	| { kind: 'data'; data: T }
	| { kind: 'close' };

export function isIpcStreamMessage(value: unknown): value is IpcStreamMessage {
	if (typeof value !== 'object' || value == null) {
		return false;
	}

	const kind = (value as { kind?: unknown }).kind;
	return kind === 'data' || kind === 'close';
}

export interface PreloadStreamBridge<TRead = unknown, TWrite = TRead> {
	subscribe: (observer: IpcStreamObserver<TRead>) => () => void;
	send: (packet: TWrite) => void;
	close: () => Promise<void>;
}

interface BasePreloadResourceBridge<TArgs extends unknown[] = unknown[]> {
	connect: (...args: TArgs) => Promise<string>;
	kill: (id: string) => Promise<void>;
}

type PreloadHandleNode<TShape extends AnyShape> = {
	[K in keyof TShape]: TShape[K] extends MethodDescriptor<
		infer TArgs,
		infer TResult
	>
		? (id: string, ...args: TArgs) => Promise<TResult>
		: TShape[K] extends NamespaceDescriptor<any, infer TChildShape>
			? PreloadHandleNode<TChildShape>
			: never;
};

type PreloadResourcePayload<TInner extends ResourceInnerDescriptor> =
	TInner extends NamespaceDescriptor<any, infer TShape>
		? { proxy: PreloadHandleNode<TShape> }
		: TInner extends StreamDescriptor<infer TRead, infer TWrite>
			? { stream: (id: string) => PreloadStreamBridge<TRead, TWrite> }
			: Record<string, never>;

export type PreloadResourceBridge<
	TArgs extends unknown[] = unknown[],
	TInner extends ResourceInnerDescriptor = ResourceInnerDescriptor,
> = BasePreloadResourceBridge<TArgs> & PreloadResourcePayload<TInner>;

export type PreloadTransportBridge<
	TArgs extends unknown[] = unknown[],
	TRead = unknown,
	TWrite = TRead,
> = PreloadResourceBridge<TArgs, StreamDescriptor<TRead, TWrite>>;

export type PreloadHandleBridge<
	TArgs extends unknown[] = unknown[],
	TShape extends AnyShape = AnyShape,
> = PreloadResourceBridge<TArgs, NamespaceDescriptor<any, TShape>>;

export type PreloadBridgeOf<D extends Descriptor> =
	D extends MethodDescriptor<infer TArgs, infer TResult>
		? (...args: TArgs) => Promise<TResult>
		: D extends StreamDescriptor<infer TRead, infer TWrite>
			? PreloadStreamBridge<TRead, TWrite>
			: D extends ResourceDescriptor<infer TArgs, infer TInner>
				? PreloadResourceBridge<TArgs, TInner>
				: D extends NamespaceDescriptor<any, infer TShape>
					? { [K in keyof TShape]: PreloadBridgeOf<TShape[K]> }
					: never;
