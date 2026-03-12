import type {
	AdapterOptions,
	ItemCompleted,
	ItemKind,
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
	| 'ready' // agent.ready received
	| 'running' // turn in progress
	| 'idle' // turn completed
	| 'error' // error event received
	| 'exited' // agent.exited received
	| 'disposed'; // handle.dispose() called

// ---------------------------------------------------------------------------
// History entries (compacted, discriminated on `kind`)
// ---------------------------------------------------------------------------

export type HistoryEntry =
	| CommandEntry
	| ItemEntry
	| SessionEntry
	| TurnEntry
	| PermissionEntry
	| ErrorEntry
	| StatusEntry;

export type CommandEntry = {
	kind: 'command';
	ts: number;
	command: ManagedAgentCommand;
};

export type ItemEntry = {
	kind: 'item';
	ts: number;
	itemKind: ItemKind;
	item: ItemCompleted;
};

export type SessionEntry = {
	kind: 'session';
	ts: number;
	event: 'started' | 'resumed' | 'forked';
};

export type TurnEntry = {
	kind: 'turn';
	ts: number;
	event: 'started' | 'completed';
};

export type PermissionEntry = {
	kind: 'permission';
	ts: number;
	event: 'requested' | 'resolved';
	payload: PermissionRequest | PermissionResolution;
};

export type ErrorEntry = {
	kind: 'error';
	ts: number;
	error: ManagedAgentError;
};

export type StatusEntry = {
	kind: 'status';
	ts: number;
	status: AgentStatus;
};

// ---------------------------------------------------------------------------
// Agent metadata (persisted alongside history)
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

export type AdapterFactory = (
	adapterKind: string,
	options: AdapterOptions,
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
// Store interface (re-exported from store.ts, declared here for use in types)
// ---------------------------------------------------------------------------

export interface AgentStore {
	saveMetadata(metadata: AgentMetadata): Promise<void>;
	loadMetadata(agentId: AgentId): Promise<AgentMetadata | undefined>;
	listMetadata(): Promise<AgentMetadata[]>;
	remove(agentId: AgentId): Promise<void>;
	appendEntry(agentId: AgentId, entry: HistoryEntry): Promise<void>;
	loadHistory(agentId: AgentId): Promise<HistoryEntry[]>;
}

// Re-export upstream types used in our public API so consumers don't need
// to import from @franklin/managed-agent directly.
export type {
	AdapterOptions,
	ItemCompleted,
	ItemKind,
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
