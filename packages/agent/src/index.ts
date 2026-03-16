// Browser-safe exports (the bulk of the public API)
export * from './browser.js';

// Node-only: spawn
export { spawn } from './spawn.js';
export type { AgentSession, SpawnOptions } from './spawn.js';

// Node-only: transports
export { createMemoryTransport } from './transport/index.js';

// Node-only: extensions
export { compileExtension } from './extensions/index.js';
export type {
	Extension,
	ExtensionAPI,
	ExtensionToolDefinition,
	McpTransportFactory,
	PromptHandler,
	SessionStartHandler,
	SessionUpdateHandler,
} from './extensions/index.js';
