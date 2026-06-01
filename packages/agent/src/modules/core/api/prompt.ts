import type { UserContent, UserMessage } from '@franklin/mini-acp';
import type { MaybePromise } from '../../../utils/maybe-promise.js';

export interface Prompt {
	readonly request: Readonly<UserMessage>;

	/**
	 * Append text to the first text content block in the prompt. If the prompt
	 * has no text content, a text block is inserted before any non-text blocks.
	 * Use `editContent` for structural changes such as adding images or
	 * reordering content blocks.
	 */
	appendContent(text: string): void;
	editContent(
		edit: (content: readonly UserContent[]) => readonly UserContent[],
	): void;

	asPrompt(): UserMessage;
}

export type PromptHandler = (prompt: Prompt) => MaybePromise<void>;
