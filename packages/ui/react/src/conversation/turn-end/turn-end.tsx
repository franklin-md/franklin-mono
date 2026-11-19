import type { ComponentType, ReactNode } from 'react';
import type { TurnEndBlock as TurnEndBlockType } from '@franklin/agent';

import type { TurnEndRendererRegistry } from './types.js';
import { resolveTurnEndRenderer } from './registry.js';

export function TurnEndBlock({
	block,
	registry,
	actions,
}: {
	block: TurnEndBlockType;
	registry: TurnEndRendererRegistry;
	actions?: ReactNode;
}) {
	const renderer = resolveTurnEndRenderer(registry, block.stopCode);
	if (!renderer) return null;
	return <>{renderer(block, actions)}</>;
}

export function createTurnEndBlock(
	registry: TurnEndRendererRegistry,
): ComponentType<{ block: TurnEndBlockType }> {
	function TurnEnd({ block }: { block: TurnEndBlockType }) {
		const renderer = resolveTurnEndRenderer(registry, block.stopCode);
		if (!renderer) return null;
		return <>{renderer(block)}</>;
	}
	TurnEnd.displayName = 'TurnEnd';
	return TurnEnd;
}
