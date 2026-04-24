import type { ReactNode } from 'react';
import type { TurnEndBlock } from '@franklin/extensions';
import type { StopCategory } from '@franklin/mini-acp';
import type { StopCode } from '@franklin/mini-acp';

export type TurnEndRenderer = (block: TurnEndBlock) => ReactNode;

export type TurnEndRendererRegistry = {
	byCode?: Partial<Record<StopCode, TurnEndRenderer>>;
	byRange?: Partial<Record<number, TurnEndRenderer>>;
	byCategory?: Partial<Record<StopCategory, TurnEndRenderer>>;
	default?: TurnEndRenderer;
};
