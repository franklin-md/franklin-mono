// Browser-safe exports (the bulk of the public API)
export * from './browser.js';

// Node-only: spawn
export { spawn } from './spawn.js';
export type { AgentSession, SpawnOptions } from './spawn.js';

// Node-only: transports
export { StdioTransport, createMemoryTransport } from './transport/index.js';
export type { StdioTransportOptions } from './transport/index.js';

// Node-only: registry
export {
	commonAgentSpecs,
	claudeAgentSpec,
	codexAgentSpec,
} from './agents/index.js';
export { AgentRegistry, createDefaultRegistry } from './registry.js';
export type { AgentSpec } from './registry.js';
