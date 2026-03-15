import type { AnyMessage } from '@agentclientprotocol/sdk';
import type { Stream } from '@franklin/transport';

export type AgentTransport = Stream<AnyMessage>;

export { StdioTransport } from './stdio.js';
export type { StdioTransportOptions } from './stdio.js';
export { createMemoryTransport } from './in-memory.js';
