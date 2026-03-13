import type {
	ContentChunk,
	Diff,
	Plan,
	ToolCall,
	ToolCallContent,
	ToolCallLocation,
	ToolCallStatus,
	ToolKind,
} from '@agentclientprotocol/sdk';

import type { TranscriptEntry } from '@franklin/react-agents/browser';

// ---------------------------------------------------------------------------
// View-model types — shaped for rendering, not raw protocol events
// ---------------------------------------------------------------------------

/** A single logical message assembled from one or more ContentChunk events. */
export interface ConversationMessage {
	id: string;
	role: 'user' | 'assistant';
	text: string;
	isStreaming: boolean;
}

/** A thought block assembled from agent_thought_chunk events. */
export interface ConversationThought {
	id: string;
	text: string;
	isStreaming: boolean;
}

/** A resolved tool call (tool_call + accumulated tool_call_updates). */
export interface ConversationToolCall {
	toolCallId: string;
	title: string;
	kind?: ToolKind;
	status?: ToolCallStatus;
	rawInput?: unknown;
	rawOutput?: unknown;
	content?: ToolCallContent[];
	locations?: ToolCallLocation[];
}

/** Discriminated union of timeline items. */
export type ConversationItem =
	| { kind: 'message'; data: ConversationMessage }
	| { kind: 'thought'; data: ConversationThought }
	| { kind: 'tool_call'; data: ConversationToolCall }
	| { kind: 'plan'; data: Plan };

export interface ConversationUsage {
	used: number;
	size: number;
	cost?: { amount: number; currency: string } | null;
}

export interface ConversationState {
	items: ConversationItem[];
	usage: ConversationUsage | null;
	isStreaming: boolean;
}

// ---------------------------------------------------------------------------
// Reducer — pure function, no side effects
// ---------------------------------------------------------------------------

function extractText(chunk: ContentChunk): string {
	if (chunk.content.type === 'text') {
		return chunk.content.text;
	}
	return '';
}

/**
 * Reduces a raw transcript (event log) into a structured ConversationState
 * suitable for rendering.
 *
 * Message chunks with the same messageId are collapsed into a single message.
 * tool_call_update events are merged into their parent tool_call.
 */
export function buildConversationState(
	transcript: readonly TranscriptEntry[],
): ConversationState {
	const items: ConversationItem[] = [];
	let usage: ConversationUsage | null = null;

	// Indexes for fast lookup during reduction
	const messageIndex = new Map<string, ConversationMessage>();
	const thoughtIndex = new Map<string, ConversationThought>();
	const toolCallIndex = new Map<string, ConversationToolCall>();

	for (const entry of transcript) {
		const update = entry.notification.update;

		switch (update.sessionUpdate) {
			case 'user_message_chunk':
			case 'agent_message_chunk': {
				const role =
					update.sessionUpdate === 'user_message_chunk' ? 'user' : 'assistant';
				const messageId = update.messageId ?? entry.id;
				const text = extractText(update);

				const existing = messageIndex.get(messageId);
				if (existing) {
					existing.text += text;
					existing.isStreaming = true;
				} else {
					// Close any previous streaming message of the same role
					for (const msg of messageIndex.values()) {
						if (msg.role === role && msg.isStreaming) {
							msg.isStreaming = false;
						}
					}
					const msg: ConversationMessage = {
						id: messageId,
						role,
						text,
						isStreaming: true,
					};
					messageIndex.set(messageId, msg);
					items.push({ kind: 'message', data: msg });
				}
				break;
			}

			case 'agent_thought_chunk': {
				const messageId = update.messageId ?? entry.id;
				const text = extractText(update);

				const existing = thoughtIndex.get(messageId);
				if (existing) {
					existing.text += text;
					existing.isStreaming = true;
				} else {
					// Close previous streaming thoughts
					for (const t of thoughtIndex.values()) {
						if (t.isStreaming) t.isStreaming = false;
					}
					const thought: ConversationThought = {
						id: messageId,
						text,
						isStreaming: true,
					};
					thoughtIndex.set(messageId, thought);
					items.push({ kind: 'thought', data: thought });
				}
				break;
			}

			case 'tool_call': {
				const tc: ConversationToolCall = {
					toolCallId: update.toolCallId,
					title: update.title,
					kind: update.kind,
					status: update.status,
					rawInput: update.rawInput,
					rawOutput: update.rawOutput,
					content: update.content,
					locations: update.locations,
				};
				toolCallIndex.set(update.toolCallId, tc);
				items.push({ kind: 'tool_call', data: tc });
				break;
			}

			case 'tool_call_update': {
				const existing = toolCallIndex.get(update.toolCallId);
				if (existing) {
					if (update.title != null) existing.title = update.title;
					if (update.kind != null) existing.kind = update.kind;
					if (update.status != null) existing.status = update.status;
					if (update.rawInput !== undefined)
						existing.rawInput = update.rawInput;
					if (update.rawOutput !== undefined)
						existing.rawOutput = update.rawOutput;
					if (update.content != null) existing.content = update.content;
					if (update.locations != null) existing.locations = update.locations;
				}
				break;
			}

			case 'plan': {
				// Replace any existing plan item or add a new one
				const existingIdx = items.findIndex((i) => i.kind === 'plan');
				const planItem: ConversationItem = {
					kind: 'plan',
					data: { entries: update.entries },
				};
				if (existingIdx >= 0) {
					items[existingIdx] = planItem;
				} else {
					items.push(planItem);
				}
				break;
			}

			case 'usage_update': {
				usage = {
					used: update.used,
					size: update.size,
					cost: update.cost,
				};
				break;
			}

			// Metadata updates — no visual representation
			case 'available_commands_update':
			case 'current_mode_update':
			case 'config_option_update':
			case 'session_info_update':
				break;
		}
	}

	// Mark the last message/thought as done streaming if the entire transcript
	// ends with a non-chunk event (e.g. tool_call, usage_update)
	const lastEntry = transcript[transcript.length - 1];
	const isCurrentlyStreaming =
		lastEntry != null &&
		[
			'user_message_chunk',
			'agent_message_chunk',
			'agent_thought_chunk',
		].includes(lastEntry.notification.update.sessionUpdate);

	return {
		items,
		usage,
		isStreaming: isCurrentlyStreaming,
	};
}

// ---------------------------------------------------------------------------
// Helpers for extracting diffs from tool call content
// ---------------------------------------------------------------------------

export function extractDiffs(content?: ToolCallContent[]): Diff[] {
	if (!content) return [];
	return content
		.filter(
			(c): c is Extract<ToolCallContent, { type: 'diff' }> => c.type === 'diff',
		)
		.map((c) => ({ path: c.path, newText: c.newText, oldText: c.oldText }));
}

export function extractToolCallText(tc: ToolCall): string {
	if (!tc.content) return '';
	return tc.content
		.filter(
			(c): c is Extract<ToolCallContent, { type: 'content' }> =>
				c.type === 'content',
		)
		.map((c) => (c.content.type === 'text' ? c.content.text : ''))
		.join('\n');
}
