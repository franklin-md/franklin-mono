import type { ReactNode } from 'react';
import type {
	TurnEndBlock,
	AgentStopCategory,
	AgentStopCode,
} from '@franklin/agent';

export type TurnEndRenderer = (block: TurnEndBlock) => ReactNode;

export type TurnEndRendererRegistry = {
	byCode?: Partial<Record<AgentStopCode, TurnEndRenderer>>;
	byRange?: Partial<Record<number, TurnEndRenderer>>;
	byCategory?: Partial<Record<AgentStopCategory, TurnEndRenderer>>;
	default?: TurnEndRenderer;
};
