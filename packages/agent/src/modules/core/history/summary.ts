import type { UserMessage } from '@franklin/mini-acp';

export function createSummaryMessage(summary: string): UserMessage {
	return {
		role: 'user',
		content: [{ type: 'text', text: `Conversation summary:\n${summary}` }],
	};
}
