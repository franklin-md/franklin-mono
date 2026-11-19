import type { ReactNode } from 'react';
import type {
	TurnEndBlock,
	AgentStopCategory,
	AgentStopCode,
} from '@franklin/agent';

/**
 * Renders a turn end. `actions` are host controls, such as Retry, that the
 * renderer places with its own controls.
 */
export type TurnEndRenderer = (
	block: TurnEndBlock,
	actions?: ReactNode,
) => ReactNode;

export type TurnEndRendererRegistry = {
	byCode?: Partial<Record<AgentStopCode, TurnEndRenderer>>;
	byRange?: Partial<Record<number, TurnEndRenderer>>;
	byCategory?: Partial<Record<AgentStopCategory, TurnEndRenderer>>;
	default?: TurnEndRenderer;
};
