import type { UserContent, UserMessage } from '@franklin/mini-acp';

export interface PromptContext {
	readonly request: Readonly<UserMessage>;

	// TODO(FRA-215): Support an optional priority number (default 0) to order prepends.
	prependContent(content: UserContent): void;
	// TODO(FRA-215): Support an optional priority number (default 0) to order appends.
	appendContent(content: UserContent): void;

	asPrompt(): UserMessage;
}

export function createPromptContext(message: UserMessage): PromptContext {
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
