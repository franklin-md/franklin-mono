import {
	type Duplex,
	type MuxPacket,
	Multiplexer,
	fromCallable,
	fromObserver,
} from '@franklin/transport';

import type { FranklinPreloadBridge } from '../../shared/schema.js';
import type { IpcStreamBridge } from '../../shared/api.js';
import type { AuthBridge } from './auth-store.js';

declare global {
	interface Window {
		__franklinBridge: FranklinPreloadBridge;
		__franklinIpcStream: IpcStreamBridge;
		__franklinAuth: AuthBridge;
	}
}

let rootMux: Multiplexer<unknown, unknown> | null = null;

export function getPreloadBridge(): FranklinPreloadBridge {
	return window.__franklinBridge;
}

function getRootMux(): Multiplexer<unknown, unknown> {
	if (rootMux) return rootMux;

	const { on, invoke } = window.__franklinIpcStream;
	const transport: Duplex<MuxPacket<unknown>, MuxPacket<unknown>> = {
		readable: fromObserver(on) as ReadableStream<MuxPacket<unknown>>,
		writable: fromCallable(invoke) as WritableStream<MuxPacket<unknown>>,
		close: async () => {},
	};

	rootMux = new Multiplexer(transport);
	return rootMux;
}

export function createIpcStream<R, W = R>(streamName: string): Duplex<R, W> {
	return getRootMux().channel(streamName) as Duplex<R, W>;
}
