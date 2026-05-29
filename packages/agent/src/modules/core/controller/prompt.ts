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
	let content: readonly UserContent[] = message.content;
	let edited = false;

	return {
		request: message,
		appendContent(text) {
			content = editHeadTextContent(content, (current) => current + text);
			edited = true;
		},
		editContent(edit) {
			content = [...edit([...content])];
			edited = true;
		},
		asPrompt() {
			if (!edited) {
				return message;
			}

			return {
				...message,
				content: [...content],
			};
		},
	};
}

function editHeadTextContent(
	content: readonly UserContent[],
	edit: (text: string) => string,
): UserContent[] {
	const headTextIndex = content.findIndex((item) => item.type === 'text');
	if (headTextIndex === -1) {
		return [{ type: 'text', text: edit('') }, ...content];
	}

	return content.map((item, index) => {
		if (index !== headTextIndex || item.type !== 'text') return item;
		return { ...item, text: edit(item.text) };
	});
}
