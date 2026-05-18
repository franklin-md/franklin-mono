import type { ComponentType } from 'react';
import type { ToolUseBlock as ToolUseBlockData } from '@franklin/extensions';

import type {
	ToolStatus,
	ResolvedToolRender,
	ToolRendererRegistry,
} from './types.js';
import { resolveToolRenderer } from './registry.js';

function resolveToolRender(
	block: ToolUseBlockData,
	status: ToolStatus,
	registry: ToolRendererRegistry,
): ResolvedToolRender | null {
	const entry = resolveToolRenderer(registry, block.call.name);
	const args = block.call.arguments;
	const summary = entry.summary({ block, status, args });
	const expanded = entry.expanded?.({ block, status, args });

	if (summary == null && expanded == null) return null;

	return {
		block,
		status,
		summary,
		expanded,
	};
}

export function ToolUseBlock({
	block,
	status,
	registry,
	Chrome,
}: {
	block: ToolUseBlockData;
	status: ToolStatus;
	registry: ToolRendererRegistry;
	Chrome: ComponentType<ResolvedToolRender>;
}) {
	const resolved = resolveToolRender(block, status, registry);
	return resolved ? <Chrome {...resolved} /> : null;
}

export function createToolUseBlock(
	registry: ToolRendererRegistry,
	Chrome: ComponentType<ResolvedToolRender>,
): ComponentType<{ block: ToolUseBlockData; status: ToolStatus }> {
	function ToolUse({
		block,
		status,
	}: {
		block: ToolUseBlockData;
		status: ToolStatus;
	}) {
		const resolved = resolveToolRender(block, status, registry);
		return resolved ? <Chrome {...resolved} /> : null;
	}
	ToolUse.displayName = 'ToolUse';
	return ToolUse;
}
