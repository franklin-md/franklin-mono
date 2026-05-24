import type { StreamEvent, UserContent, UserMessage } from '@franklin/mini-acp';
import type { Prompt, PromptHandler } from '../api/prompt.js';
import type { CoreRegistry } from '../registrations/index.js';

export function createPromptBuilder(
	registrations: CoreRegistry,
): (message: UserMessage) => Promise<UserMessage> {
	const handlers = registrations.handlersFor('prompt');

	return (message) => buildPrompt(message, handlers);
}

export function createPromptObservers(
	registrations: CoreRegistry,
): (event: StreamEvent) => void {
	const observers = {
		turnStart: registrations.handlersFor('turnStart'),
		chunk: registrations.handlersFor('chunk'),
		update: registrations.handlersFor('update'),
		turnEnd: registrations.handlersFor('turnEnd'),
	};

	return (event) => {
		const fns = observers[event.type];
		for (const fn of fns) {
			(fn as (e: typeof event) => void)(event);
		}
	};
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
