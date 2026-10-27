import type { Context } from '../types/context.js';
import { estimateMessageTokens } from './message.js';

export function estimateContextTokens(
	context: Omit<Context, 'config'>,
): number {
	return (
		Math.ceil(
			(context.systemPrompt.length + JSON.stringify(context.tools).length) / 4,
		) +
		context.messages.reduce(
			(tokens, message) => tokens + estimateMessageTokens(message),
			0,
		)
	);
}
