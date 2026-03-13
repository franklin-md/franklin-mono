import type {
	AdapterOptions,
	ManagedAgentAdapter,
	ManagedAgentCommand,
	ManagedAgentCommandResult,
	ManagedAgentError,
	ManagedAgentEvent,
	PermissionRequest,
	PermissionResolution,
	SessionRef,
	SessionSpec,
} from '@franklin/managed-agent';

// ---------------------------------------------------------------------------
// Core identifiers
// ---------------------------------------------------------------------------

export type AgentId = string;

export type AgentStatus =
	| 'created' // handle created, adapter not yet ready
	| 'ready' // session command succeeded
	| 'running' // turn in progress
	| 'idle' // turn completed
	| 'error' // error event received
	| 'exited' // agent.exited received
	| 'disposed'; // handle.dispose() called

// ---------------------------------------------------------------------------
// Agent metadata (persisted alongside events)
// ---------------------------------------------------------------------------

export interface AgentMetadata {
	agentId: AgentId;
	adapterKind: string;
	status: AgentStatus;
	createdAt: number;
	updatedAt: number;
	sessionRef: SessionRef;
	sessionSpec: SessionSpec;
}

// ---------------------------------------------------------------------------
// Factory + options
// ---------------------------------------------------------------------------

export interface AdapterFactoryOptions extends AdapterOptions {
	agentId: AgentId;
	metadata: AgentMetadata;
}

export type AdapterFactory = (
	adapterKind: string,
	options: AdapterFactoryOptions,
) => ManagedAgentAdapter;

export interface AgentManagerOptions {
	store?: AgentStore;
	adapterFactory: AdapterFactory;
}

export interface CreateAgentSpec {
	adapterKind: string;
	sessionSpec: SessionSpec;
}

// ---------------------------------------------------------------------------
// Event listener types
// ---------------------------------------------------------------------------

export type AgentEventHandler = (event: ManagedAgentEvent) => void;
export type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// Store interface — raw ManagedAgentEvent storage, no compaction
// ---------------------------------------------------------------------------

export interface AgentStore {
	saveMetadata(metadata: AgentMetadata): Promise<void>;
	loadMetadata(agentId: AgentId): Promise<AgentMetadata | undefined>;
	listMetadata(): Promise<AgentMetadata[]>;
	remove(agentId: AgentId): Promise<void>;
	appendEvent(agentId: AgentId, event: ManagedAgentEvent): Promise<void>;
	loadEvents(agentId: AgentId): Promise<ManagedAgentEvent[]>;
}

// Re-export upstream types used in our public API so consumers don't need
// to import from @franklin/managed-agent directly.
export type {
	AdapterOptions,
	ManagedAgentAdapter,
	ManagedAgentCommand,
	ManagedAgentCommandResult,
	ManagedAgentError,
	ManagedAgentEvent,
	PermissionRequest,
	PermissionResolution,
	SessionRef,
	SessionSpec,
};
