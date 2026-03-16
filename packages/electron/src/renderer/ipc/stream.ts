import {
	type MultiplexedEventInterface,
	type Duplex,
	createMultiplexedEventStream,
} from '@franklin/transport';

// ---------------------------------------------------------------------------
// Bridge type — matches what the preload exposes
// ---------------------------------------------------------------------------

interface FranklinBridge {
	ipcStream: MultiplexedEventInterface<unknown>;
	agent: {
		provisionEnv: (opts?: unknown) => Promise<string>;
		disposeEnv: (envId: string) => Promise<void>;
		spawn: (envId: string, name: string) => Promise<string>;
		kill: (agentId: string) => Promise<void>;
	};
	mcp: {
		start: (mcpId: string, tools: unknown) => Promise<unknown>;
		stop: (mcpId: string) => Promise<void>;
	};
}

declare global {
	interface Window {
		__franklinBridge: FranklinBridge;
	}
}

export type { FranklinBridge };

/**
 * Creates a Duplex stream backed by Electron IPC (renderer-process side).
 *
 * Level 1 demux: reads from the shared IPC channel and returns a named
 * stream (e.g. "agent-transport" or "mcp-transport").
 */
export function createIpcStream<T>(streamName: string): Duplex<T> {
	return createMultiplexedEventStream<unknown>(
		streamName,
		window.__franklinBridge.ipcStream,
	) as Duplex<T>;
}
