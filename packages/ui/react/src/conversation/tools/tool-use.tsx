import type { ComponentType } from 'react';
import type { ToolUseBlock as ToolUseBlockData } from '@franklin/extensions';

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
	return (
		<Chrome
			block={block}
			status={status}
			summary={entry.summary({ block, status })}
			expanded={entry.expanded?.({ block, status })}
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
		const entry = resolveToolRenderer(registry, block.call.name);
		return (
			<Chrome
				block={block}
				status={status}
				summary={entry.summary({ block, status })}
				expanded={entry.expanded?.({ block, status })}
			/>
		);
	}
	ToolUse.displayName = 'ToolUse';
	return ToolUse;
}
