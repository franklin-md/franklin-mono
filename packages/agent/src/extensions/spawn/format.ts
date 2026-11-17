import type { Message } from '@franklin/mini-acp';
import type { AgentTurnEnd } from '../../modules/core/turn/types.js';
import { agentStopCategory } from '../../modules/core/turn/stop-category.js';
import type { RenderedToolOutput } from '../../modules/core/index.js';

export function formatResult(
	messages: Message[],
	turnEnd: AgentTurnEnd | undefined,
): string | RenderedToolOutput {
	if (turnEnd && agentStopCategory(turnEnd.stopCode) !== 'finished') {
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
