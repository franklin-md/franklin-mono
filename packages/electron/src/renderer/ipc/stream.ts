import type { Filesystem } from '@franklin/lib';
import {
	type Duplex,
	type MuxPacket,
	Multiplexer,
	fromObserver,
	fromCallable,
} from '@franklin/transport';

// ---------------------------------------------------------------------------
// Bridge type — matches what the preload exposes
// ---------------------------------------------------------------------------

interface FranklinBridge {
	ipcStream: {
		on: (callback: (packet: unknown) => void) => () => void;
		invoke: (packet: unknown) => void;
	};
	app: {
		getStorage: () => Promise<string>;
	};
	agent: {
		spawn: () => Promise<string>;
		kill: (agentId: string) => Promise<void>;
	};

	filesystem: Filesystem;
}

declare global {
	interface Window {
		__franklinBridge: FranklinBridge;
	}
}

export type { FranklinBridge };

// ---------------------------------------------------------------------------
// Lazy singleton for the Level 0 multiplexer
// ---------------------------------------------------------------------------

let mux: Multiplexer<unknown> | null = null;

function getMux(): Multiplexer<unknown> {
	if (!mux) {
		const { on, invoke } = window.__franklinBridge.ipcStream;
		const transport: Duplex<MuxPacket<unknown>> = {
			readable: fromObserver(on) as ReadableStream<MuxPacket<unknown>>,
			writable: fromCallable(invoke) as WritableStream<MuxPacket<unknown>>,
			close: async () => {},
		};
		mux = new Multiplexer(transport);
	}
	return mux;
}

/**
 * Creates a Duplex stream backed by Electron IPC (renderer-process side).
 *
 * Level 1 demux: reads from the shared IPC channel and returns a named
 * stream (e.g. "agent-transport" or "mcp-transport").
 */
export function createIpcStream<R, W = R>(streamName: string): Duplex<R, W> {
	return getMux().channel(streamName) as Duplex<R, W>;
}
