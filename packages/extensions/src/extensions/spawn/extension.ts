import type { Message, TurnEnd } from '@franklin/mini-acp';
import { collect, stopCategory } from '@franklin/mini-acp';
import type { CoreAPI } from '../../api/core/api.js';
import type { ToolExecuteReturn } from '../../api/core/tool.js';
import type { SessionAPI } from '../../api/session/api.js';
import type { CoreSystem } from '../../runtime-system/core.js';
import type { Extension } from '../../types/extension.js';
import { spawnSpec } from './tools.js';

export function spawnExtension(): Extension<CoreAPI & SessionAPI<CoreSystem>> {
	return (api) => {
		const { createChild } = api.session;

		api.registerTool(spawnSpec, async ({ prompt }) => {
			const child = await createChild();
			try {
				await child.runtime.setContext({
					history: { systemPrompt: '', messages: [] },
				});
				const stream = child.runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: prompt }],
				});
				const { messages, turnEnd } = await collect(stream);
				return formatResult(messages, turnEnd);
			} finally {
				await child.runtime.session.removeSelf();
			}
		});
	};
}

// Returns 'Last Message'
function formatResult(
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
