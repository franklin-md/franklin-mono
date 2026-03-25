import type { Duplex } from '@franklin/transport';

export interface IpcStreamBridge {
	on: (callback: (packet: unknown) => void) => () => void;
	invoke: (packet: unknown) => void;
}

export interface PreloadTransportBridge<TArgs extends unknown[] = unknown[]> {
	connect: (...args: TArgs) => Promise<string>;
	kill: (id: string) => Promise<void>;
}

type PreloadBridgeShape<T> = {
	[K in keyof T]: T[K] extends (
		...args: infer TArgs
	) => Promise<Duplex<any, any>>
		? PreloadTransportBridge<TArgs>
		: T[K] extends (...args: any[]) => Promise<any>
			? T[K]
			: PreloadBridgeShape<T[K]>;
};

export type PreloadBridgeOf<T> = PreloadBridgeShape<T>;
