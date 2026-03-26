import type {
	Descriptor,
	DuplexDescriptor,
	HandleMemberDescriptor,
	LeaseDescriptor,
	LeaseInnerDescriptor,
	MethodDescriptor,
	ProxyDescriptor,
} from './descriptors/types.js';

export interface IpcStreamBridge {
	on: (callback: (packet: unknown) => void) => () => void;
	invoke: (packet: unknown) => void;
}

interface BasePreloadLeaseBridge<TArgs extends unknown[] = unknown[]> {
	connect: (...args: TArgs) => Promise<string>;
	kill: (id: string) => Promise<void>;
}

type PreloadLeaseNode<TShape extends Record<string, HandleMemberDescriptor>> = {
	[K in keyof TShape]: TShape[K] extends MethodDescriptor<infer TArgs, infer TResult>
		? (id: string, ...args: TArgs) => Promise<TResult>
		: TShape[K] extends ProxyDescriptor<any, infer TChildShape>
			? TChildShape extends Record<string, HandleMemberDescriptor>
				? PreloadLeaseNode<TChildShape>
				: never
			: never;
};

type PreloadLeasePayload<TInner extends LeaseInnerDescriptor> =
	TInner extends ProxyDescriptor<any, infer TShape>
		? TShape extends Record<string, HandleMemberDescriptor>
			? { proxy: PreloadLeaseNode<TShape> }
			: never
		: {};

export type PreloadLeaseBridge<
	TArgs extends unknown[] = unknown[],
	TInner extends LeaseInnerDescriptor = LeaseInnerDescriptor,
> = BasePreloadLeaseBridge<TArgs> & PreloadLeasePayload<TInner>;

export type PreloadTransportBridge<
	TArgs extends unknown[] = unknown[],
> = PreloadLeaseBridge<TArgs, DuplexDescriptor<any>>;

export type PreloadHandleBridge<
	TArgs extends unknown[] = unknown[],
	TShape extends Record<string, HandleMemberDescriptor> = Record<
		string,
		HandleMemberDescriptor
	>,
> = PreloadLeaseBridge<TArgs, ProxyDescriptor<any, TShape>>;

type PreloadValue<TDescriptor extends Descriptor> =
	TDescriptor extends MethodDescriptor<infer TArgs, infer TResult>
		? (...args: TArgs) => Promise<TResult>
		: TDescriptor extends LeaseDescriptor<infer TArgs, infer TInner>
			? PreloadLeaseBridge<TArgs, TInner>
			: TDescriptor extends ProxyDescriptor<any, infer TShape>
				? PreloadNode<TShape>
				: never;

type PreloadNode<TShape extends Record<string, Descriptor>> = {
	[K in keyof TShape]: PreloadValue<TShape[K]>;
};

export type PreloadBridgeOf<TSchema extends ProxyDescriptor<any, any>> =
	TSchema extends ProxyDescriptor<any, infer TShape>
		? PreloadNode<TShape>
		: never;
