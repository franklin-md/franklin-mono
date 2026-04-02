import type { UserMessage } from '../../types/message.js';
import type { Action } from '../types.js';

export function prompt(text: string): Action {
	const message: UserMessage = {
		role: 'user',
		content: [{ type: 'text', text }],
	};
	return { type: 'prompt', message };
}
