import type { LLMConfigPatch } from '../../types/context.js';
import type { Message } from '../../types/message.js';
import type { Action, SetContextPayload } from '../types.js';
import type { ToolSpec } from '../types.js';

export function setContext(opts?: {
	systemPrompt?: string;
	messages?: Message[];
	tools?: ToolSpec[];
	config?: LLMConfigPatch;
}): Action {
	const context: SetContextPayload = {};

	if (opts?.systemPrompt !== undefined) {
		context.systemPrompt = opts.systemPrompt;
	}

	if (opts?.messages !== undefined) {
		context.messages = opts.messages;
	}

	if (opts?.tools !== undefined) {
		context.tools = opts.tools;
	}

	if (opts?.config) {
		context.config = opts.config;
	}

	return { type: 'setContext', context };
}
