// Framework
export { NodeFramework } from './framework.js';
export type { FrameworkOptions } from './framework.js';

// Environment
export { NodeEnvironment, provision } from './environment.js';
export type { ProvisionOptions } from './environment.js';

// Tool transport factory (McpTransportFactory implementation)
export { createToolTransport } from './tool-transport.js';

// Registry
export { AgentRegistry, createDefaultRegistry } from './registry.js';

// Agent specs
export {
	commonAgentSpecs,
	claudeAgentSpec,
	codexAgentSpec,
} from './agents/index.js';
