import type { ContentBlock } from '@agentclientprotocol/sdk';

import { createStore } from '../../../store/index.js';
import type { Store } from '../../../store/index.js';
import type { Extension, ExtensionAPI } from '../../types/index.js';
import type {
	AgentTextEntry,
	AgentThoughtEntry,
	ConversationTurn,
	ToolCallEntry,
} from './types.js';

/**
 * Extension that maintains a flat, coalesced conversation transcript.
 *
 * Listens to `prompt` (to record user messages) and `sessionUpdate`
 * (to record agent text, thoughts, and tool calls). Streaming chunks
 * with the same `messageId` are coalesced into single entries.
 *
 * Exposes a `conversation` store for UI binding.
 */
export class ConversationExtension implements Extension {
	readonly name = 'conversation';
	readonly conversation: Store<ConversationTurn[]> = createStore<
		ConversationTurn[]
	>([]);

	async setup(api: ExtensionAPI): Promise<void> {
		const { conversation } = this;

		api.on('prompt', async (ctx) => {
			conversation.set((draft) => {
				draft.push({
					id: crypto.randomUUID(),
					timestamp: Date.now(),
					entries: [{ type: 'user', content: [...ctx.prompt] }],
				});
			});
			return undefined;
		});

		api.on('sessionUpdate', async (ctx) => {
			const { update } = ctx.notification;

			switch (update.sessionUpdate) {
				case 'agent_message_chunk':
					appendChunk(conversation, 'text', update.content, update.messageId);
					break;
				case 'agent_thought_chunk':
					appendChunk(
						conversation,
						'thought',
						update.content,
						update.messageId,
					);
					break;
				case 'tool_call':
					conversation.set((draft) => {
						const turn = draft[draft.length - 1];
						if (!turn) return;
						const entry: ToolCallEntry = {
							type: 'tool_call',
							toolCallId: update.toolCallId,
							title: update.title,
							status: update.status,
							kind: update.kind,
							content: update.content,
							rawInput: update.rawInput,
							rawOutput: update.rawOutput,
							locations: update.locations,
						};
						turn.entries.push(entry);
					});
					break;
				case 'tool_call_update':
					conversation.set((draft) => {
						const turn = draft[draft.length - 1];
						if (!turn) return;
						for (let i = turn.entries.length - 1; i >= 0; i--) {
							const entry = turn.entries[i];
							if (
								entry &&
								entry.type === 'tool_call' &&
								entry.toolCallId === update.toolCallId
							) {
								if (update.status != null) entry.status = update.status;
								if (update.title != null) entry.title = update.title;
								if (update.kind != null) entry.kind = update.kind;
								if (update.content != null) entry.content = update.content;
								if (update.rawInput !== undefined)
									entry.rawInput = update.rawInput;
								if (update.rawOutput !== undefined)
									entry.rawOutput = update.rawOutput;
								if (update.locations != null)
									entry.locations = update.locations;
								break;
							}
						}
					});
					break;
				default:
					break;
			}
		});
	}
}

/**
 * Coalesces a content chunk into the latest turn. If an entry with the
 * same `messageId` exists, appends to it; otherwise creates a new entry.
 * When `messageId` is absent, appends to the last entry if it matches
 * the same type (consecutive chunks from the same stream).
 */
function appendChunk(
	conversation: Store<ConversationTurn[]>,
	type: 'text' | 'thought',
	content: ContentBlock,
	messageId?: string | null,
) {
	conversation.set((draft) => {
		const turn = draft[draft.length - 1];
		if (!turn) return;

		if (messageId) {
			// Try to coalesce with an existing entry by messageId
			for (let i = turn.entries.length - 1; i >= 0; i--) {
				const entry = turn.entries[i];
				if (
					entry &&
					(entry.type === 'text' || entry.type === 'thought') &&
					entry.messageId === messageId
				) {
					entry.content.push(content);
					return;
				}
			}
		} else {
			// No messageId — coalesce with the last entry if it's the same type
			const last = turn.entries[turn.entries.length - 1];
			if (last && last.type === type) {
				(last as AgentTextEntry | AgentThoughtEntry).content.push(content);
				return;
			}
		}

		// No existing entry to coalesce with — create one
		turn.entries.push({
			type,
			messageId: messageId ?? crypto.randomUUID(),
			content: [content],
		} as AgentTextEntry | AgentThoughtEntry);
	});
}
