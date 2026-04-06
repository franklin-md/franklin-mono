import type { ComponentType, ReactNode } from 'react';
import type {
	ConversationTurn,
	ToolUseBlock,
	TurnEndBlock,
} from '@franklin/extensions';

import type { ToolStatus } from './tools/types.js';

export type ConversationComponents = {
	Text: ComponentType<{ text: string }>;
	Thinking: ComponentType<{ text: string }>;
	ToolUse: ComponentType<{ block: ToolUseBlock; status: ToolStatus }>;
	TurnEnd?: ComponentType<{ block: TurnEndBlock }>;
	UserMessage: ComponentType<{ message: ConversationTurn['prompt'] }>;
	Turn?: ComponentType<{ children: ReactNode }>;
	AssistantMessage?: ComponentType<{ children: ReactNode }>;
};
