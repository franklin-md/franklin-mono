import type { Ctx } from '../../types/context.js';
import type { Message } from '../../types/message.js';
import type { Action } from '../types.js';
import type { ToolSpec } from '../types.js';

export function setContext(opts?: {
	systemPrompt?: string;
	messages?: Message[];
	tools?: ToolSpec[];
	config?: Ctx['config'];
}): Action {
	const ctx: Partial<Ctx> = {
		history: {
			systemPrompt: opts?.systemPrompt ?? 'You are a test agent.',
			messages: opts?.messages ?? [],
		},
		tools: (opts?.tools ?? []).map((t) => t.definition),
		...(opts?.config ? { config: opts.config } : {}),
	};
	return { type: 'setContext', ctx };
}
