import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ToolArgs, ToolSpec } from '@franklin/extensions';
import { createToolRenderer, type ToolRendererEntry } from '@franklin/react';

export function iconEntry<T = Record<string, unknown>>(
	Icon: LucideIcon,
	label: string,
	detail?: (args: T) => ReactNode,
): ToolRendererEntry<T> {
	return {
		summary: ({ args }) => {
			const d = detail?.(args);
			return (
				<>
					<Icon className="h-3 w-3 shrink-0" />
					<span className="shrink-0">{label}</span>
					{d != null && (
						<span className="truncate text-muted-foreground/50">{d}</span>
					)}
				</>
			);
		},
	};
}

export function toolEntry<S extends ToolSpec>(
	spec: S,
	Icon: LucideIcon,
	label: string,
	detail?: (args: ToolArgs<S>) => ReactNode,
) {
	return createToolRenderer(spec, iconEntry(Icon, label, detail));
}
