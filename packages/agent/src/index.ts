// Browser-safe exports (the bulk of the public API)
export * from './browser.js';

export type { AgentSession, SpawnOptions } from './spawn.js';

// Node-only: transports
export { createMemoryTransport } from './transport/index.js';
export { StdioTransport } from './transport/stdio.js';
export type { StdioTransportOptions } from './transport/stdio.js';

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
