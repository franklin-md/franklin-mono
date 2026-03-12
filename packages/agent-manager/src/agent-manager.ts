import { AgentHandle } from './agent-handle.js';
import { InMemoryAgentStore } from './store.js';
import type {
	AdapterFactory,
	AgentId,
	AgentManagerOptions,
	AgentMetadata,
	AgentStore,
	CreateAgentSpec,
} from './types.js';

/**
 * Top-level orchestrator for managed agents. The app creates, resumes, and
 * disposes agents through this class — never touching adapters directly.
 */
export class AgentManager {
	private readonly store: AgentStore;
	private readonly adapterFactory: AdapterFactory;
	private readonly handles = new Map<AgentId, AgentHandle>();

	constructor(options: AgentManagerOptions) {
		this.store = options.store ?? new InMemoryAgentStore();
		this.adapterFactory = options.adapterFactory;
	}

	// -----------------------------------------------------------------------
	// Create
	// -----------------------------------------------------------------------

	/**
	 * Create a new agent. The caller provides the agentId (not auto-generated).
	 * Returns a handle — the caller dispatches session.start themselves.
	 */
	async create(agentId: AgentId, spec: CreateAgentSpec): Promise<AgentHandle> {
		if (this.handles.has(agentId)) {
			throw new Error(`Agent "${agentId}" already exists`);
		}

		const now = Date.now();
		const metadata: AgentMetadata = {
			agentId,
			adapterKind: spec.adapterKind,
			status: 'created',
			createdAt: now,
			updatedAt: now,
			sessionRef: {},
			sessionSpec: spec.sessionSpec,
		};

		const handle = this.createHandle(agentId, spec.adapterKind, metadata);
		this.handles.set(agentId, handle);
		await this.store.saveMetadata(metadata);

		return handle;
	}

	// -----------------------------------------------------------------------
	// Resume
	// -----------------------------------------------------------------------

	/**
	 * Resume an existing agent. Returns the same handle reference if already
	 * live in memory. Otherwise loads metadata from the store and creates a
	 * fresh adapter + handle.
	 */
	async resume(agentId: AgentId): Promise<AgentHandle> {
		const existing = this.handles.get(agentId);
		if (existing) return existing;

		const metadata = await this.store.loadMetadata(agentId);
		if (!metadata) {
			throw new Error(`No agent found for id "${agentId}"`);
		}

		const handle = this.createHandle(agentId, metadata.adapterKind, metadata);
		this.handles.set(agentId, handle);

		return handle;
	}

	// -----------------------------------------------------------------------
	// Get / List
	// -----------------------------------------------------------------------

	/** Returns the live handle or undefined. Does not hit the store. */
	get(agentId: AgentId): AgentHandle | undefined {
		return this.handles.get(agentId);
	}

	/** Lists all known agent metadata from the store. */
	async list(): Promise<AgentMetadata[]> {
		return this.store.listMetadata();
	}

	// -----------------------------------------------------------------------
	// Remove
	// -----------------------------------------------------------------------

	/** Disposes the handle (if live) and removes all persisted data. */
	async remove(agentId: AgentId): Promise<void> {
		const handle = this.handles.get(agentId);
		if (handle) {
			await handle.dispose();
		}
		await this.store.remove(agentId);
	}

	// -----------------------------------------------------------------------
	// Dispose all
	// -----------------------------------------------------------------------

	/** Disposes all live handles. Intended for app shutdown. */
	async disposeAll(): Promise<void> {
		const handles = [...this.handles.values()];
		await Promise.all(handles.map((h) => h.dispose()));
	}

	// -----------------------------------------------------------------------
	// Private
	// -----------------------------------------------------------------------

	private createHandle(
		agentId: AgentId,
		adapterKind: string,
		metadata: AgentMetadata,
	): AgentHandle {
		// The handle is created first, then the adapter, because the adapter's
		// onEvent callback needs to route to the handle. We use a late-binding
		// reference to solve the circular dependency.
		const handleRef: { current: AgentHandle | null } = { current: null };

		const adapter = this.adapterFactory(adapterKind, {
			agentId,
			metadata,
			onEvent: (event) => {
				const handle = handleRef.current;
				if (!handle) {
					throw new Error('Agent handle was not initialized');
				}
				handle._handleEvent(event);
			},
		});

		const handle = new AgentHandle(
			agentId,
			adapter,
			this.store,
			metadata,
			(id) => this.handles.delete(id),
		);
		handleRef.current = handle;

		return handle;
	}
}
