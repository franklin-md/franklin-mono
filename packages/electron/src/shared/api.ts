import type {
	Descriptor,
	HandleDescriptor,
	HandleMemberDescriptor,
	MethodDescriptor,
	ProxyDescriptor,
	TransportDescriptor,
} from './descriptors/types.js';

export interface IpcStreamBridge {
	on: (callback: (packet: unknown) => void) => () => void;
	invoke: (packet: unknown) => void;
}

export interface PreloadLeaseBridge<TArgs extends unknown[] = unknown[]> {
	connect: (...args: TArgs) => Promise<string>;
	kill: (id: string) => Promise<void>;
}

export interface PreloadTransportBridge<
	TArgs extends unknown[] = unknown[],
> extends PreloadLeaseBridge<TArgs> {}

export interface PreloadHandleBridge<
	TArgs extends unknown[] = unknown[],
	TShape extends Record<string, HandleMemberDescriptor> = Record<
		string,
		HandleMemberDescriptor
	>,
> extends PreloadLeaseBridge<TArgs> {
	proxy: PreloadHandleNode<TShape>;
}

type PreloadHandleNode<TShape extends Record<string, HandleMemberDescriptor>> =
	{
		[K in keyof TShape]: TShape[K] extends MethodDescriptor<
			infer TArgs,
			infer TResult
		>
			? (id: string, ...args: TArgs) => Promise<TResult>
			: TShape[K] extends ProxyDescriptor<any, infer TChildShape>
				? TChildShape extends Record<string, HandleMemberDescriptor>
					? PreloadHandleNode<TChildShape>
					: never
				: never;
	};

type PreloadValue<TDescriptor extends Descriptor> =
	TDescriptor extends MethodDescriptor<infer TArgs, infer TResult>
		? (...args: TArgs) => Promise<TResult>
		: TDescriptor extends TransportDescriptor<infer TArgs, any>
			? PreloadTransportBridge<TArgs>
			: TDescriptor extends HandleDescriptor<infer TArgs, any, infer TShape>
				? PreloadHandleBridge<TArgs, TShape>
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
