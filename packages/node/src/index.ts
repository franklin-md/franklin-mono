// Framework
export { NodeFramework, type SpawnOptions } from './framework.js';

// Registry (kept for subprocess agent specs)
export { AgentRegistry, createDefaultRegistry } from './registry.js';

// Agent specs
export {
	commonAgentSpecs,
	claudeAgentSpec,
	codexAgentSpec,
} from './agents/index.js';
