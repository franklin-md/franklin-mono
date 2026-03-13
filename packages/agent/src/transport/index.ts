import type { Stream } from '@agentclientprotocol/sdk';

export interface Transport {
	readonly stream: Stream;
	dispose(): Promise<void>;
}

export { StdioTransport } from './stdio.js';
export type { StdioTransportOptions } from './stdio.js';
export { createMemoryTransport } from './in-memory.js';
