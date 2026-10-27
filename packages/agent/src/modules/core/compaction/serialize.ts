import type { Message } from '@franklin/mini-acp';

export function serializeMessages(messages: readonly Message[]): string {
	return messages
		.map(
			(message) =>
				`[${message.role}${message.role === 'toolResult' ? ` ${message.toolCallId}` : ''}]\n${message.content
					.flatMap((block) => {
						switch (block.type) {
							case 'thinking':
								return [];
							case 'image':
								return ['[image omitted]'];
							case 'toolCall':
								return [JSON.stringify(block)];
							case 'text':
								return [block.text];
						}
					})
					.join('\n')}`,
		)
		.join('\n\n');
}
