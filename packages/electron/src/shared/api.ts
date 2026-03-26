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
		: {};

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

type PreloadValue<TDescriptor extends Descriptor> =
	TDescriptor extends MethodDescriptor<infer TArgs, infer TResult>
		? (...args: TArgs) => Promise<TResult>
		: TDescriptor extends ResourceDescriptor<infer TArgs, infer TInner>
			? PreloadLeaseBridge<TArgs, TInner>
			: TDescriptor extends NamespaceDescriptor<any, infer TShape>
				? PreloadNode<TShape>
				: never;

type PreloadNode<TShape extends AnyShape> = {
	[K in keyof TShape]: PreloadValue<TShape[K]>;
};

export type PreloadBridgeOf<TSchema extends NamespaceDescriptor<any, any>> =
	TSchema extends NamespaceDescriptor<any, infer TShape>
		? PreloadNode<TShape>
		: never;
