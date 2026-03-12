import type { ItemKind, ManagedAgentEvent } from '@franklin/managed-agent';

import type { HistoryEntry } from './types.js';

/**
 * Stateful processor that buffers item lifecycle events and yields compacted
 * HistoryEntry values. Raw item.delta events are never persisted — only the
 * final item.completed snapshot is recorded.
 */
export class ItemCompactor {
	private pendingItemKind: ItemKind | undefined;

	/**
	 * Process a single ManagedAgentEvent and return zero or more HistoryEntry
	 * values to persist.
	 *
	 * @param event - The event from the adapter
	 * @param now   - Current timestamp (injected for testability)
	 */
	process(event: ManagedAgentEvent, now: number): HistoryEntry[] {
		switch (event.type) {
			// -- Item lifecycle --------------------------------------------------

			case 'item.started': {
				this.pendingItemKind = event.item.kind;
				return [];
			}

			case 'item.delta': {
				// Deltas are not accumulated — item.completed carries the final text.
				return [];
			}

			case 'item.completed': {
				this.pendingItemKind = undefined;
				return [
					{
						kind: 'item',
						ts: now,
						itemKind: event.item.kind,
						item: event.item,
					},
				];
			}

			// -- Turn / session boundaries ---------------------------------------

			case 'turn.started': {
				return [{ kind: 'turn', ts: now, event: 'started' }];
			}

			case 'turn.completed': {
				// Discard any pending item (interrupted mid-stream)
				this.pendingItemKind = undefined;
				return [{ kind: 'turn', ts: now, event: 'completed' }];
			}

			// -- Session events --------------------------------------------------

			case 'session.started': {
				return [{ kind: 'session', ts: now, event: 'started' }];
			}

			case 'session.resumed': {
				return [{ kind: 'session', ts: now, event: 'resumed' }];
			}

			case 'session.forked': {
				return [{ kind: 'session', ts: now, event: 'forked' }];
			}

			// -- Permission events -----------------------------------------------

			case 'permission.requested': {
				return [
					{
						kind: 'permission',
						ts: now,
						event: 'requested',
						payload: event.payload,
					},
				];
			}

			case 'permission.resolved': {
				return [
					{
						kind: 'permission',
						ts: now,
						event: 'resolved',
						payload: event.payload,
					},
				];
			}

			// -- Error -----------------------------------------------------------

			case 'error': {
				// Error yields immediately; pending item stays (may still complete)
				return [{ kind: 'error', ts: now, error: event.error }];
			}

			// -- Agent lifecycle -------------------------------------------------

			case 'agent.ready': {
				return [{ kind: 'status', ts: now, status: 'ready' }];
			}

			case 'agent.exited': {
				// Discard any pending item (process died)
				this.pendingItemKind = undefined;
				return [{ kind: 'status', ts: now, status: 'exited' }];
			}
		}

		const _exhaustive: never = event;
		return _exhaustive;
	}

	/** Reset internal state (e.g. on dispose). */
	reset(): void {
		this.pendingItemKind = undefined;
	}
}
