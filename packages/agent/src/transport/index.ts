import type { AnyMessage } from '@agentclientprotocol/sdk';
import type { Duplex } from '@franklin/transport';

export type AgentTransport = Duplex<AnyMessage>;

export { createMemoryTransport } from './in-memory.js';
