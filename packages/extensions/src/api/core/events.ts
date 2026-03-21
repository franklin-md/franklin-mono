import type {
	ContentBlock,
	SessionNotification,
} from '@agentclientprotocol/sdk';
import type { MaybePromise } from '../../types/shared.js';

export interface PromptContext {
	prompt: ContentBlock[];
}

export interface PromptTransform {
	prompt: ContentBlock[];
}

export type PromptHandler = (
	ctx: PromptContext,
) => MaybePromise<PromptTransform | undefined>;

export interface SessionUpdateContext {
	notification: SessionNotification;
}

export type SessionUpdateHandler = (
	ctx: SessionUpdateContext,
) => MaybePromise<void>;

export interface CoreEventMap {
	prompt: PromptHandler;
	sessionUpdate: SessionUpdateHandler;
}

export type CoreEvent = keyof CoreEventMap;
