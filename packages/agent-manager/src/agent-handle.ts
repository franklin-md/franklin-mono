import type {
	ManagedAgentAdapter,
	ManagedAgentCommand,
	ManagedAgentCommandResult,
	ManagedAgentEvent,
} from '@franklin/managed-agent';

import type {
	AgentEventHandler,
	AgentId,
	AgentMetadata,
	AgentStatus,
	AgentStore,
	Unsubscribe,
} from './types.js';

// ---------------------------------------------------------------------------
// AgentHandle
// ---------------------------------------------------------------------------

/**
 * A handle to a single managed agent instance. Provides dispatch, event
 * subscription, event log access, and disposal.
 *
 * The app interacts with agents exclusively through handles obtained from
 * AgentManager.create() or AgentManager.resume().
 */
export class AgentHandle {
	readonly agentId: AgentId;

	private _metadata: AgentMetadata;
	private readonly adapter: ManagedAgentAdapter;
	private readonly store: AgentStore;
	private readonly listeners = new Set<AgentEventHandler>();
	private readonly onRemoveFromManager: (agentId: AgentId) => void;

	constructor(
		agentId: AgentId,
		adapter: ManagedAgentAdapter,
		store: AgentStore,
		metadata: AgentMetadata,
		onRemoveFromManager: (agentId: AgentId) => void,
	) {
		this.agentId = agentId;
		this.adapter = adapter;
		this.store = store;
		this._metadata = metadata;
		this.onRemoveFromManager = onRemoveFromManager;
	}

	// -----------------------------------------------------------------------
	// Public accessors
	// -----------------------------------------------------------------------

	get status(): AgentStatus {
		return this._metadata.status;
	}

	get metadata(): AgentMetadata {
		return this._metadata;
	}

	// -----------------------------------------------------------------------
	// Command dispatch
	// -----------------------------------------------------------------------

	async dispatch(
		command: ManagedAgentCommand,
	): Promise<ManagedAgentCommandResult> {
		if (this.status === 'disposed') {
			return {
				ok: false,
				error: { code: 'DISPOSED', message: 'Agent handle is disposed' },
			};
		}

		return this.adapter.dispatch(command);
	}

	// -----------------------------------------------------------------------
	// Event subscription
	// -----------------------------------------------------------------------

	/**
	 * Register an event listener. Returns an unsubscribe function.
	 * Listeners receive raw events including item deltas.
	 */
	on(handler: AgentEventHandler): Unsubscribe {
		this.listeners.add(handler);
		return () => {
			this.listeners.delete(handler);
		};
	}

	// -----------------------------------------------------------------------
	// Events
	// -----------------------------------------------------------------------

	async events(): Promise<ManagedAgentEvent[]> {
		return this.store.loadEvents(this.agentId);
	}

	// -----------------------------------------------------------------------
	// Dispose
	// -----------------------------------------------------------------------

	async dispose(): Promise<void> {
		if (this.status === 'disposed') return;

		this.updateStatus('disposed');
		void this.persistMetadata(Date.now());

		await this.adapter.dispose();

		this.listeners.clear();
		this.onRemoveFromManager(this.agentId);
	}

	// -----------------------------------------------------------------------
	// Internal — called by AgentManager's event interceptor
	// -----------------------------------------------------------------------

	/** @internal */
	_handleEvent(event: ManagedAgentEvent): void {
		// 1. Fan out to all listeners (raw events, including deltas)
		for (const listener of this.listeners) {
			listener(event);
		}

		// 2. Update internal status based on event type
		this.updateStatusFromEvent(event);

		// 3. Append raw event to store
		const now = Date.now();
		void this.store.appendEvent(this.agentId, event);
		void this.persistMetadata(now);
	}

	// -----------------------------------------------------------------------
	// Private helpers
	// -----------------------------------------------------------------------

	private updateStatusFromEvent(event: ManagedAgentEvent): void {
		switch (event.type) {
			case 'agent.ready':
				this.updateStatus('ready');
				return;
			case 'turn.started':
				this.updateStatus('running');
				return;
			case 'turn.completed':
				this.updateStatus('idle');
				return;
			case 'error':
				this.updateStatus('error');
				return;
			case 'agent.exited':
				this.updateStatus('exited');
				return;
			case 'session.started':
			case 'session.resumed':
			case 'session.forked':
			case 'item.started':
			case 'item.delta':
			case 'item.completed':
			case 'permission.requested':
			case 'permission.resolved':
				return;
		}
	}

	private updateStatus(status: AgentStatus): void {
		this._metadata = { ...this._metadata, status };
	}

	private async persistMetadata(now: number): Promise<void> {
		this._metadata = { ...this._metadata, updatedAt: now };
		await this.store.saveMetadata(this._metadata);
	}
}
