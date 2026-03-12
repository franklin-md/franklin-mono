import type { ManagedAgentEvent } from '@franklin/managed-agent';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConversationItem = {
	kind: 'user_message' | 'assistant_message';
	text: string;
	streaming: boolean;
};

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/**
 * Folds a raw ManagedAgentEvent[] into renderable conversation items.
 *
 * Walks events and accumulates item groups:
 *   item.started  → begin a new item
 *   item.delta    → append textDelta
 *   item.completed → finalize with completed text
 *
 * Non-item events are skipped.
 * If the last item has no item.completed, streaming is true.
 */
export function eventsToConversation(
	events: ManagedAgentEvent[],
): ConversationItem[] {
	const items: ConversationItem[] = [];
	let current: ConversationItem | undefined;

	for (const event of events) {
		switch (event.type) {
			case 'item.started': {
				// Finalize any previous item that was never completed
				if (current) {
					items.push(current);
				}
				current = {
					kind: event.item.kind,
					text: 'text' in event.item ? event.item.text : '',
					streaming: true,
				};
				break;
			}

			case 'item.delta': {
				if (current) {
					current = {
						...current,
						text: current.text + event.item.textDelta,
					};
				}
				break;
			}

			case 'item.completed': {
				if (current) {
					current = {
						...current,
						text: event.item.text,
						streaming: false,
					};
					items.push(current);
					current = undefined;
				}
				break;
			}

			// Non-item events are skipped
			case 'agent.ready':
			case 'session.started':
			case 'session.resumed':
			case 'session.forked':
			case 'turn.started':
			case 'turn.completed':
			case 'permission.requested':
			case 'permission.resolved':
			case 'error':
			case 'agent.exited':
				break;
		}
	}

	// If there's a pending item (started but not completed), it's still streaming
	if (current) {
		items.push(current);
	}

	return items;
}
