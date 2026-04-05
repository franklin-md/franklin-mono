import type { ReactNode } from 'react';
import type { StopCategory } from '@franklin/mini-acp';
import type { TurnEndBlock as TurnEndBlockType } from '@franklin/extensions';
import { type StopCode, stopCategory } from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TurnEndRenderer = (block: TurnEndBlockType) => ReactNode;

export type TurnEndRendererRegistry = {
	byCode?: Partial<Record<StopCode, TurnEndRenderer>>;
	byRange?: Partial<Record<number, TurnEndRenderer>>;
	byCategory?: Partial<Record<StopCategory, TurnEndRenderer>>;
	default?: TurnEndRenderer;
};

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

export function resolveTurnEndRenderer(
	registry: TurnEndRendererRegistry,
	code: StopCode,
): TurnEndRenderer | null {
	return (
		registry.byCode?.[code] ??
		registry.byRange?.[Math.floor((code as number) / 100)] ??
		registry.byCategory?.[stopCategory(code)] ??
		registry.default ??
		null
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TurnEndBlock({
	block,
	registry,
}: {
	block: TurnEndBlockType;
	registry: TurnEndRendererRegistry;
}) {
	const renderer = resolveTurnEndRenderer(registry, block.stopCode);
	if (!renderer) return null;
	return <>{renderer(block)}</>;
}
