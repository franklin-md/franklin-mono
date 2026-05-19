import type { ComponentType } from 'react';
import type { ToolUseBlock as ToolUseBlockData } from '@franklin/agent';

import type {
	ToolStatus,
	ResolvedToolRender,
	ToolRendererRegistry,
} from './types.js';
import { resolveToolRenderer } from './registry.js';

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
	const entry = resolveToolRenderer(registry, block.call.name);
	if (entry == null) return null;

	const args = block.call.arguments;
	const summary = entry.summary({ block, status, args });
	const expanded = entry.expanded?.({ block, status, args });
	if (summary == null && expanded == null) return null;

	return (
		<Chrome
			block={block}
			status={status}
			summary={summary}
			expanded={expanded}
		/>
	);
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
		return (
			<ToolUseBlock
				block={block}
				status={status}
				registry={registry}
				Chrome={Chrome}
			/>
		);
	}
	ToolUse.displayName = 'ToolUse';
	return ToolUse;
}
