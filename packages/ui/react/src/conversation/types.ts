import type { ComponentType, ReactNode } from 'react';
import type {
	ConversationTurn,
	TextBlock,
	ThinkingBlock,
	ToolUseBlock,
	TurnEndBlock,
} from '@franklin/extensions';

import type { ToolStatus } from './tools/types.js';

export type ConversationComponents = {
	Text: ComponentType<{ block: TextBlock }>;
	Thinking: ComponentType<{ block: ThinkingBlock }>;
	ToolUse: ComponentType<{ block: ToolUseBlock; status: ToolStatus }>;
	TurnEnd?: ComponentType<{ block: TurnEndBlock }>;
	UserMessage: ComponentType<{ message: ConversationTurn['prompt'] }>;
	Turn?: ComponentType<{ children: ReactNode }>;
	AssistantMessage?: ComponentType<{ children: ReactNode }>;
};
