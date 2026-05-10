import { type Message, type TurnEnd, stopCategory } from '@franklin/mini-acp';
import type { ToolExecuteReturn } from '../../modules/core/index.js';

export function formatResult(
	messages: Message[],
	turnEnd: TurnEnd | undefined,
): ToolExecuteReturn {
	if (turnEnd && stopCategory(turnEnd.stopCode) !== 'finished') {
		return {
			content: [
				{
					type: 'text',
					text: turnEnd.stopMessage ?? 'Child agent turn ended with an error',
				},
			],
			isError: true,
		};
	}

	const lastMessage = messages[messages.length - 1];
	if (!lastMessage) {
		return {
			content: [{ type: 'text', text: 'Child agent produced no response' }],
			isError: true,
		};
	}

	const text = lastMessage.content
		.flatMap((block) => (block.type === 'text' ? [block.text] : []))
		.join('');

	return text;
}
