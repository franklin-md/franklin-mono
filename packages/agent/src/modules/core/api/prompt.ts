import type { UserContent, UserMessage } from '@franklin/mini-acp';

export interface Prompt {
	readonly request: Readonly<UserMessage>;

	prependContent(content: UserContent): void;
	appendContent(content: UserContent): void;

	asPrompt(): UserMessage;
}

export function createPrompt(message: UserMessage): Prompt {
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
