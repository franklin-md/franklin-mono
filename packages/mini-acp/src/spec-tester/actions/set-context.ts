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
	const ctx: SetContextPayload = {};

	if (opts?.systemPrompt !== undefined || opts?.messages !== undefined) {
		ctx.history = {};
		if (opts.systemPrompt !== undefined) {
			ctx.history.systemPrompt = opts.systemPrompt;
		}
		if (opts.messages !== undefined) {
			ctx.history.messages = opts.messages;
		}
	}

	if (opts?.tools !== undefined) {
		ctx.tools = opts.tools;
	}

	if (opts?.config) {
		ctx.config = opts.config;
	}

	return { type: 'setContext', ctx };
}
