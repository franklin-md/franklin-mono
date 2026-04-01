import type { Update } from '@franklin/mini-acp';
import type { ConversationTurn } from '../types.js';

/**
 * Handle an Update event by dispatching on the message role.
 *
 * - Assistant messages with toolCall content → push toolUse blocks
 * - ToolResult messages → pair the result with its matching toolUse block
 * - Assistant message_end (full message) → reconciliation (replace chunked content)
 */
export function handleUpdate(turn: ConversationTurn, update: Update): void {
	const { message } = update;

	// TODO: we should replace all the message.
	switch (message.role) {
		case 'assistant': {
			// Extract tool call content blocks → push toolUse blocks
			for (const block of message.content) {
				if (block.type === 'toolCall') {
					turn.response.blocks.push({
						kind: 'toolUse',
						call: block,
						result: undefined,
					});
				}
			}
			break;
		}
		case 'toolResult': {
			// Find the matching toolUse block and fill in the result
			for (const block of turn.response.blocks) {
				if (block.kind === 'toolUse' && block.call.id === message.toolCallId) {
					block.result = message.content;
					break;
				}
			}
			break;
		}
		case 'user':
			// User messages in updates are not expected during a response stream
			break;
	}
}
