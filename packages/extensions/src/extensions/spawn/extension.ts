import type { Message, TurnEnd } from '@franklin/mini-acp';
import { collect, stopCategory } from '@franklin/mini-acp';
import { createExtension } from '../../algebra/index.js';
import type {
	CoreAPI,
	CoreSystem,
	ToolExecuteReturn,
} from '../../systems/core/index.js';
import type { SessionRuntime } from '../../systems/sessions/index.js';
import { spawnSpec } from './tools.js';

/**
 * Spawn a child agent with a fresh prompt and return its last message.
 */
export function spawnExtension() {
	return createExtension<[CoreAPI], [SessionRuntime<CoreSystem>]>((api) => {
		api.registerTool(spawnSpec, async ({ prompt }, ctx) => {
			const child = await ctx.session.child();
			try {
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
	});
}

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
