import type { UserContent, UserMessage } from '@franklin/mini-acp';
import type { Prompt, PromptHandler } from '../../../../api/prompt.js';
import type { CoreRegistry } from '../../../../registrations/index.js';

export function createPromptBuilder(
	registrations: CoreRegistry,
): (message: UserMessage) => Promise<UserMessage> {
	const handlers = registrations.handlersFor('prompt');

	return (message) => buildPrompt(message, handlers);
}

async function buildPrompt(
	message: UserMessage,
	handlers: readonly PromptHandler[],
): Promise<UserMessage> {
	if (handlers.length === 0) return message;

	const prompt = createPrompt(message);
	for (const handler of handlers) {
		await handler(prompt);
	}
	return prompt.asPrompt();
}

function createPrompt(message: UserMessage): Prompt {
	const prepended: UserContent[] = [];
	const appended: UserContent[] = [];

	return {
		request: message,
		prependContent(content) {
			prepended.push(content);
		},
		appendContent(content) {
			appended.push(content);
		},
		asPrompt() {
			if (prepended.length === 0 && appended.length === 0) {
				return message;
			}

			return {
				...message,
				content: [...prepended, ...message.content, ...appended],
			};
		},
	};
}
