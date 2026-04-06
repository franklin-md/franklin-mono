import type { ComponentType } from 'react';
import type { TurnEndBlock as TurnEndBlockType } from '@franklin/extensions';

import type { TurnEndRendererRegistry } from './types.js';
import { resolveTurnEndRenderer } from './registry.js';

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
