import type { UserContent, UserMessage } from '@franklin/mini-acp';
import type { MaybePromise } from '../../../utils/maybe-promise.js';

export interface Prompt {
	readonly request: Readonly<UserMessage>;

	prependContent(content: UserContent): void;
	appendContent(content: UserContent): void;

	asPrompt(): UserMessage;
}

export type PromptHandler = (prompt: Prompt) => MaybePromise<void>;
