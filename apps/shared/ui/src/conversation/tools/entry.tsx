import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ToolArgs, ToolSpec } from '@franklin/extensions';
import { createToolRenderer, type ToolRendererEntry } from '@franklin/react';

import { ToolSummary } from './summary.js';

export function iconEntry<T = Record<string, unknown>>(
	Icon: LucideIcon,
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
	Icon: LucideIcon,
	label: ReactNode,
	children?: (args: ToolArgs<S>) => ReactNode,
) {
	return createToolRenderer(spec, iconEntry(Icon, label, children));
}
