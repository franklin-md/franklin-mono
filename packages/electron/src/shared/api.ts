import type {
	AnyShape,
	Descriptor,
	MethodDescriptor,
	NamespaceDescriptor,
	ResourceDescriptor,
	ResourceInnerDescriptor,
	StreamDescriptor,
} from '@franklin/lib/proxy';

export interface IpcStreamBridge {
	on: (callback: (packet: unknown) => void) => () => void;
	invoke: (packet: unknown) => void;
}

interface BasePreloadLeaseBridge<TArgs extends unknown[] = unknown[]> {
	connect: (...args: TArgs) => Promise<string>;
	kill: (id: string) => Promise<void>;
}

type PreloadLeaseNode<TShape extends AnyShape> = {
	[K in keyof TShape]: TShape[K] extends MethodDescriptor<
		infer TArgs,
		infer TResult
	>
		? (id: string, ...args: TArgs) => Promise<TResult>
		: TShape[K] extends NamespaceDescriptor<any, infer TChildShape>
			? PreloadLeaseNode<TChildShape>
			: never;
};

type PreloadLeasePayload<TInner extends ResourceInnerDescriptor> =
	TInner extends NamespaceDescriptor<any, infer TShape>
		? { proxy: PreloadLeaseNode<TShape> }
		: Record<string, never>;

export type PreloadLeaseBridge<
	TArgs extends unknown[] = unknown[],
	TInner extends ResourceInnerDescriptor = ResourceInnerDescriptor,
> = BasePreloadLeaseBridge<TArgs> & PreloadLeasePayload<TInner>;

export type PreloadTransportBridge<TArgs extends unknown[] = unknown[]> =
	PreloadLeaseBridge<TArgs, StreamDescriptor<any, any>>;

export type PreloadHandleBridge<
	TArgs extends unknown[] = unknown[],
	TShape extends AnyShape = AnyShape,
> = PreloadLeaseBridge<TArgs, NamespaceDescriptor<any, TShape>>;

export type PreloadBridgeOf<D extends Descriptor> =
	D extends MethodDescriptor<infer TArgs, infer TResult>
		? (...args: TArgs) => Promise<TResult>
		: D extends ResourceDescriptor<infer TArgs, infer TInner>
			? PreloadLeaseBridge<TArgs, TInner>
			: D extends NamespaceDescriptor<any, infer TShape>
				? { [K in keyof TShape]: PreloadBridgeOf<TShape[K]> }
				: never;
