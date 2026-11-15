import type { AssistantBlock, ToolUseBlock } from '@franklin/agent';
import { Wrench } from 'lucide-react';
import {
	computeToolStatus,
	resolveToolRenderer,
	type ToolRendererRegistry,
	type ToolStatus,
} from '@franklin/react';

import type {
	ActivityHeaderData,
	ActivityIcon,
	ActivityItem,
} from './types.js';

type HeaderEntry = {
	item: ActivityItem;
	pending: boolean;
};

type ToolActivity = HeaderEntry & {
	status: ToolStatus;
	getIcon: () => ActivityIcon;
};

function resolveToolActivity(
	block: ToolUseBlock,
	registry: ToolRendererRegistry,
): ToolActivity | undefined {
	const status = computeToolStatus(block);
	const renderer = resolveToolRenderer(registry, block.call.name);
	const props = { block, status, args: block.call.arguments };
	const summary = renderer?.summary(props);
	// Respect host-hidden tools, but keep failures discoverable even when a
	// host normally suppresses the tool's summary.
	if (summary == null && !renderer?.expanded && status !== 'error') {
		return undefined;
	}

	return {
		item: { id: block.call.id, content: summary ?? block.call.name },
		pending: status === 'in-progress',
		status,
		getIcon: () => ({
			id: block.call.id,
			name: block.call.name,
			Icon: renderer?.icon?.(props) ?? Wrench,
		}),
	};
}

function collectActivityIcons(tools: ToolActivity[]): ActivityIcon[] {
	const icons: ActivityIcon[] = [];
	// Different tool names can share an icon. Resolve only enough icons to fill
	// the header's three distinct slots, keeping their first-seen order.
	for (const tool of tools) {
		if (icons.length === 3) break;
		const icon = tool.getIcon();
		if (!icons.some((existing) => existing.Icon === icon.Icon)) {
			icons.push(icon);
		}
	}
	return icons;
}

function getCurrentActivity(entries: HeaderEntry[]): ActivityItem | undefined {
	// Parallel actions may finish out of order; prefer the last pending action
	// over a newer action that has already completed.
	return (
		entries.findLast((entry) => entry.pending)?.item ?? entries.at(-1)?.item
	);
}

function formatActivitySummary(thinking: boolean, tools: number): string {
	const parts = [];
	if (thinking) parts.push('Thought');
	if (tools > 0) parts.push(`${tools} tool ${tools === 1 ? 'call' : 'calls'}`);
	return parts.join(' · ') || 'Activity';
}

export function getActivityHeader(
	blocks: AssistantBlock[],
	registry: ToolRendererRegistry,
): ActivityHeaderData {
	const entries: HeaderEntry[] = [];
	const tools: ToolActivity[] = [];
	let thinking = false;

	// Collect displayable actions in response order; text stays in the expanded
	// activity body but does not contribute a header label or count.
	for (const [index, block] of blocks.entries()) {
		if (block.kind === 'thinking') {
			thinking = true;
			entries.push({
				item: { id: `thinking-${index}`, content: 'Thinking…' },
				pending: block.endedAt === undefined,
			});
			continue;
		}
		if (block.kind !== 'toolUse') continue;
		const tool = resolveToolActivity(block, registry);
		if (!tool) continue;
		entries.push(tool);
		tools.push(tool);
	}

	return {
		current: getCurrentActivity(entries),
		icons: collectActivityIcons(tools),
		errors: tools.filter((tool) => tool.status === 'error').length,
		summary: formatActivitySummary(thinking, tools.length),
	};
}
