import type { ReactNode } from 'react';
import type { ToolArgsOf, ToolSpec } from '@franklin/agent';
import { createToolRenderer, type ToolRendererEntry } from '@franklin/react';

import { ToolSummary, type ToolSummaryIcon } from './summary.js';

export function iconEntry<T = Record<string, unknown>>(
	Icon: ToolSummaryIcon,
	label: ReactNode,
	children?: (args: T) => ReactNode,
): ToolRendererEntry<T> {
	return {
		summary: ({ args }) => (
			<ToolSummary icon={Icon} label={label}>
				{children?.(args)}
			</ToolSummary>
		),
	};
}

export function toolEntry<S extends ToolSpec>(
	spec: S,
	Icon: ToolSummaryIcon,
	label: ReactNode,
	children?: (args: ToolArgsOf<S>) => ReactNode,
) {
	return createToolRenderer(spec, iconEntry(Icon, label, children));
}
