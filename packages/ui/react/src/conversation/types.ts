import type { ComponentType, ReactNode } from 'react';
import type {
	AssistantBlock,
	TextBlock,
	ThinkingBlock,
	ToolUseBlock,
	TurnEndBlock,
} from '@franklin/agent';

import type { ConversationRenderTurn } from './turn-info/types.js';
import type { ToolStatus } from './tools/types.js';

export type ConversationActivityProps = {
	turn: ConversationRenderTurn;
	blocks: AssistantBlock[];
	children: ReactNode;
};

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
	Activity?: ComponentType<ConversationActivityProps>;
	Waiting?: ComponentType<{ turn: ConversationRenderTurn }>;
	Footer?: ComponentType<{ turn: ConversationRenderTurn }>;
	EmptyPlaceholder?: ComponentType;
};
