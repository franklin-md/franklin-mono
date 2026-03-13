import type { TranscriptEntry } from '@franklin/react-agents';

type MessageConversationItem = {
	id: string;
	kind: 'user_message' | 'agent_message' | 'agent_thought';
	text: string;
	streaming: boolean;
};

type ToolCallConversationItem = {
	id: string;
	kind: 'tool_call';
	streaming: false;
	toolTitle?: string;
	toolStatus?: string;
};

export type ConversationItem =
	| MessageConversationItem
	| ToolCallConversationItem;

export interface ProjectTranscriptOptions {
	isRunning?: boolean;
}

function textContent(entry: TranscriptEntry): string | null {
	const { update } = entry.notification;
	if (
		update.sessionUpdate !== 'user_message_chunk' &&
		update.sessionUpdate !== 'agent_message_chunk' &&
		update.sessionUpdate !== 'agent_thought_chunk'
	) {
		return null;
	}

	return update.content.type === 'text' ? update.content.text : null;
}

function messageKind(
	entry: TranscriptEntry,
): MessageConversationItem['kind'] | null {
	switch (entry.notification.update.sessionUpdate) {
		case 'user_message_chunk':
			return 'user_message';
		case 'agent_message_chunk':
			return 'agent_message';
		case 'agent_thought_chunk':
			return 'agent_thought';
		case 'tool_call':
		case 'tool_call_update':
		case 'plan':
		case 'available_commands_update':
		case 'current_mode_update':
		case 'config_option_update':
		case 'session_info_update':
		case 'usage_update':
			return null;
	}
}

export function projectTranscript(
	transcript: readonly TranscriptEntry[],
	options: ProjectTranscriptOptions = {},
): ConversationItem[] {
	const items: ConversationItem[] = [];
	let current: Omit<MessageConversationItem, 'streaming'> | null = null;

	function flushCurrent(streaming = false): void {
		if (!current) return;
		items.push({
			...current,
			streaming,
		});
		current = null;
	}

	for (const entry of transcript) {
		const kind = messageKind(entry);
		const text = textContent(entry);
		const update = entry.notification.update;

		if (kind && text !== null) {
			if (current && current.kind === kind) {
				current = {
					id: current.id,
					kind: current.kind,
					text: current.text + text,
				};
			} else {
				flushCurrent();
				current = {
					id: entry.id,
					kind,
					text,
				};
			}
			continue;
		}

		switch (update.sessionUpdate) {
			case 'user_message_chunk':
			case 'agent_message_chunk':
			case 'agent_thought_chunk':
			case 'tool_call':
				flushCurrent();
				if (update.sessionUpdate === 'tool_call') {
					items.push({
						id: update.toolCallId,
						kind: 'tool_call',
						streaming: false,
						toolTitle: update.title,
						toolStatus: update.status,
					});
				}
				break;

			case 'tool_call_update':
				{
					flushCurrent();
					const idx = items.findLastIndex(
						(item) =>
							item.kind === 'tool_call' && item.id === update.toolCallId,
					);
					if (idx !== -1) {
						const existing = items[idx];
						if (existing?.kind === 'tool_call') {
							items[idx] = {
								...existing,
								toolTitle: update.title ?? existing.toolTitle,
								toolStatus: update.status ?? existing.toolStatus,
							};
						}
					}
				}
				break;

			case 'plan':
			case 'available_commands_update':
			case 'current_mode_update':
			case 'config_option_update':
			case 'session_info_update':
			case 'usage_update':
				flushCurrent();
				break;
		}
	}

	flushCurrent(Boolean(options.isRunning));
	return items;
}
