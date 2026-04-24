import type { ComponentType, ReactNode } from 'react';
import type {
	TextBlock,
	ThinkingBlock,
	ToolUseBlock,
	TurnEndBlock,
} from '@franklin/extensions';

import type { ConversationRenderTurn } from './turn-info/types.js';
import type { ToolStatus } from './tools/types.js';

export type ConversationComponents = {
	Text: ComponentType<{ block: TextBlock }>;
	Thinking: ComponentType<{ block: ThinkingBlock }>;
	ToolUse: ComponentType<{ block: ToolUseBlock; status: ToolStatus }>;
	TurnEnd?: ComponentType<{ block: TurnEndBlock }>;
	UserMessage: ComponentType<{ turn: ConversationRenderTurn }>;
	Turn?: ComponentType<{ turn: ConversationRenderTurn; children: ReactNode }>;
	AssistantMessage?: ComponentType<{
		turn: ConversationRenderTurn;
		children: ReactNode;
	}>;
	Waiting?: ComponentType<{ turn: ConversationRenderTurn }>;
	Footer?: ComponentType<{ turn: ConversationRenderTurn }>;
};
