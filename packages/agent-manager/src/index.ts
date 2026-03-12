// Classes
export { AgentHandle } from './agent-handle.js';
export { AgentManager } from './agent-manager.js';
export { ItemCompactor } from './item-compactor.js';
export { InMemoryAgentStore } from './store.js';

// Types
export type {
	AdapterFactory,
	AgentEventHandler,
	AgentId,
	AgentManagerOptions,
	AgentMetadata,
	AgentStatus,
	AgentStore,
	CommandEntry,
	CreateAgentSpec,
	ErrorEntry,
	HistoryEntry,
	ItemEntry,
	PermissionEntry,
	SessionEntry,
	StatusEntry,
	TurnEntry,
	Unsubscribe,
} from './types.js';
