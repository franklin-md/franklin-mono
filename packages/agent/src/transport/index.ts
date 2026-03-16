import type { AnyMessage } from '@agentclientprotocol/sdk';
import type { Stream } from '@franklin/transport';

export type AgentTransport = Stream<AnyMessage>;

export { createMemoryTransport } from './in-memory.js';
