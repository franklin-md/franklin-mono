import type {
	AgentConnection,
	AgentStack,
	RequestPermissionRequest,
	RequestPermissionResponse,
	SessionNotification,
} from '@franklin/agent';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentStatus = 'idle' | 'running' | 'error' | 'disposed';

export type ConversationItem = {
	id: string;
	kind: 'user_message' | 'agent_message' | 'agent_thought' | 'tool_call';
	text: string;
	streaming: boolean;
	toolTitle?: string;
	toolStatus?: string;
};

export type PendingPermission = {
	request: RequestPermissionRequest;
	resolve: (response: RequestPermissionResponse) => void;
};

export interface AgentStoreSnapshot {
	status: AgentStatus;
	items: readonly ConversationItem[];
	pendingPermission: PendingPermission | null;
}

// ---------------------------------------------------------------------------
// AgentStore — per-agent state container
// ---------------------------------------------------------------------------

export class AgentStore {
	readonly agentId: string;

	private _status: AgentStatus = 'idle';
	private _items: ConversationItem[] = [];
	private _current: ConversationItem | null = null;
	private _pendingPermission: PendingPermission | null = null;
	private _listeners = new Set<() => void>();
	private _snapshot: AgentStoreSnapshot;
	private _stack: AgentStack | undefined;
	private _sessionId: string | undefined;
	private _nextId = 0;

	constructor(agentId: string) {
		this.agentId = agentId;
		this._snapshot = this._buildSnapshot();
	}

	get snapshot(): AgentStoreSnapshot {
		return this._snapshot;
	}

	subscribe(listener: () => void): () => void {
		this._listeners.add(listener);
		return () => {
			this._listeners.delete(listener);
		};
	}

	async prompt(text: string): Promise<void> {
		if (!this._stack || !this._sessionId) return;

		// Add local user message immediately
		this._flushCurrent();
		this._items.push({
			id: this._genId('user'),
			kind: 'user_message',
			text,
			streaming: false,
		});
		this._status = 'running';
		this._emit();

		try {
			await this._stack.prompt({
				sessionId: this._sessionId,
				prompt: [{ type: 'text', text }],
			});
			this._flushCurrent();
			this._status = 'idle';
		} catch (_err) {
			this._flushCurrent();
			this._status = 'error';
		}
		this._emit();
	}

	resolvePermission(optionId: string): void {
		const pending = this._pendingPermission;
		if (!pending) return;
		this._pendingPermission = null;
		this._emit();
		pending.resolve({ outcome: { outcome: 'selected', optionId } });
	}

	async cancel(): Promise<void> {
		if (!this._stack || !this._sessionId) return;
		await this._stack.cancel({ sessionId: this._sessionId });
	}

	async dispose(): Promise<void> {
		if (this._status === 'disposed') return;
		this._status = 'disposed';
		this._emit();
		await this._stack?.dispose();
	}

	// --- Internal: called by TuiAgentManager ---

	_handleSessionUpdate(params: SessionNotification): void {
		const { update } = params;

		switch (update.sessionUpdate) {
			case 'user_message_chunk':
				// Skip — we echo user messages locally in prompt()
				return;

			case 'agent_message_chunk': {
				const text = update.content.type === 'text' ? update.content.text : '';
				if (this._current?.kind === 'agent_message') {
					this._current = {
						...this._current,
						text: this._current.text + text,
					};
				} else {
					this._flushCurrent();
					this._current = {
						id: this._genId('msg'),
						kind: 'agent_message',
						text,
						streaming: true,
					};
				}
				break;
			}

			case 'agent_thought_chunk': {
				const text = update.content.type === 'text' ? update.content.text : '';
				if (this._current?.kind === 'agent_thought') {
					this._current = {
						...this._current,
						text: this._current.text + text,
					};
				} else {
					this._flushCurrent();
					this._current = {
						id: this._genId('thought'),
						kind: 'agent_thought',
						text,
						streaming: true,
					};
				}
				break;
			}

			case 'tool_call': {
				this._flushCurrent();
				this._items.push({
					id: update.toolCallId,
					kind: 'tool_call',
					text: '',
					streaming: false,
					toolTitle: update.title,
					toolStatus: update.status,
				});
				break;
			}

			case 'tool_call_update': {
				const idx = this._items.findLastIndex(
					(item) => item.kind === 'tool_call' && item.id === update.toolCallId,
				);
				if (idx !== -1) {
					const existing = this._items[idx];
					if (existing) {
						this._items[idx] = {
							...existing,
							toolTitle: update.title ?? existing.toolTitle,
							toolStatus: update.status ?? existing.toolStatus,
						};
					}
				}
				break;
			}

			case 'plan':
			case 'available_commands_update':
			case 'current_mode_update':
			case 'config_option_update':
			case 'session_info_update':
			case 'usage_update':
				return;
		}

		this._emit();
	}

	_handleRequestPermission(
		params: RequestPermissionRequest,
	): Promise<RequestPermissionResponse> {
		return new Promise((resolve) => {
			this._pendingPermission = { request: params, resolve };
			this._emit();
		});
	}

	_init(
		stack: AgentStack,
		sessionId: string,
		connection: AgentConnection,
	): void {
		this._stack = stack;
		this._sessionId = sessionId;

		// Transition to disposed when connection closes
		void connection.closed.then(() => {
			if (this._status !== 'disposed') {
				this._status = 'disposed';
				this._emit();
			}
		});
	}

	// --- Private helpers ---

	private _flushCurrent(): void {
		if (this._current) {
			this._items.push({ ...this._current, streaming: false });
			this._current = null;
		}
	}

	private _emit(): void {
		this._snapshot = this._buildSnapshot();
		for (const listener of this._listeners) {
			listener();
		}
	}

	private _buildSnapshot(): AgentStoreSnapshot {
		const items = this._current ? [...this._items, this._current] : this._items;
		return {
			status: this._status,
			items,
			pendingPermission: this._pendingPermission,
		};
	}

	private _genId(prefix: string): string {
		return `${prefix}-${this._nextId++}`;
	}
}
