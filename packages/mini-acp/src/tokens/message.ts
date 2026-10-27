import type { Message } from '../types/message.js';

export function estimateMessageTokens(message: Message): number {
	// Provider tokenizers differ. Ignore image bytes and reserve a fixed image
	// allowance rather than treating base64 length as text tokens.
	return (
		8 +
		message.content.reduce((tokens, block) => {
			if (block.type === 'image') return tokens + 1600;
			const text =
				block.type === 'toolCall' ? JSON.stringify(block) : block.text;
			return tokens + Math.ceil(text.length / 4);
		}, 0)
	);
}
