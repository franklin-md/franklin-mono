import type { AssistantBlock } from '@franklin/agent';
import { Wrench } from 'lucide-react';
import {
	computeToolStatus,
	resolveToolRenderer,
	type ToolRendererRegistry,
} from '@franklin/react';

import type { ActivityDisclosureProps } from './types.js';
import type { ToolSummaryIcon } from '../tools/summary.js';

export function getActivityModel(
	blocks: AssistantBlock[],
	registry: ToolRendererRegistry,
) {
	let current: ActivityDisclosureProps['current'];
	let pending: typeof current;
	let tools = 0;
	let errors = 0;
	let thinking = false;
	const icons: { id: string; name: string; Icon: ToolSummaryIcon }[] = [];

	for (const [index, block] of blocks.entries()) {
		if (block.kind === 'thinking') {
			thinking = true;
			current = { id: `thinking-${index}`, content: 'Thinking…' };
			if (block.endedAt === undefined) pending = current;
		}
		if (block.kind !== 'toolUse') continue;
		const status = computeToolStatus(block);
		const entry = resolveToolRenderer(registry, block.call.name);
		const props = { block, status, args: block.call.arguments };
		const summary = entry?.summary(props);
		// Respect host-hidden tools, but keep failures discoverable even when a
		// host normally suppresses the tool's summary.
		if (summary == null && !entry?.expanded && status !== 'error') continue;
		tools++;
		if (icons.length < 3) {
			const Icon = entry?.icon?.(props) ?? Wrench;
			if (!icons.some((icon) => icon.Icon === Icon)) {
				icons.push({ id: block.call.id, name: block.call.name, Icon });
			}
		}
		if (status === 'error') errors++;
		current = { id: block.call.id, content: summary ?? block.call.name };
		if (status === 'in-progress') pending = current;
	}

	const parts = [];
	if (thinking) parts.push('Thought');
	if (tools > 0) parts.push(`${tools} tool ${tools === 1 ? 'call' : 'calls'}`);
	return {
		current: pending ?? current,
		icons,
		errors,
		summary: parts.join(' · ') || 'Activity',
	};
}
