import { method, event, notification, namespace } from '@franklin/lib';

import type { Chunk, TurnEnd, Update } from '../types/stream.js';
import type { ToolExecuteParams, ToolResult } from '../types/tool.js';
import type { PromptParams, CancelParams } from '../base/types.js';
import type { AgentCtx, InitializeParams, InitializeResult } from './types.js';

// TODO: Can we get namespace to take on the implementation type instead of the descriptor type?
export const muServerDescriptor = namespace({
	initialize: method<(params: InitializeParams) => Promise<InitializeResult>>(),
	setContext: method<(params: AgentCtx) => Promise<InitializeResult>>(),
	prompt:
		event<(params: PromptParams) => AsyncIterable<Chunk | Update | TurnEnd>>(),
	cancel: notification<(params: CancelParams) => Promise<void>>(),
});

export const muClientDescriptor = namespace({
	toolExecute: method<(params: ToolExecuteParams) => Promise<ToolResult>>(),
});
