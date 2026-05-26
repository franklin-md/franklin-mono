import type { ElementType, ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

export type ToolSummaryIcon = ElementType<{ className?: string }>;

export interface ToolSummaryProps {
	icon: ToolSummaryIcon;
	label?: ReactNode;
	children?: ReactNode;
	labelClassName?: string;
}

export function ToolSummary({
	icon: Icon,
	label,
	children,
	labelClassName,
}: ToolSummaryProps) {
	return (
		<>
			<Icon className="h-3 w-3 shrink-0" />
			{label != null && (
				<span className={cn('shrink-0', labelClassName)}>{label}</span>
			)}
			{children}
		</>
	);
}

export function ToolSummaryDetail({
	children,
	className,
}: {
	children?: ReactNode;
	className?: string;
}) {
	return (
		<span className={cn('truncate text-current opacity-50', className)}>
			{children}
		</span>
	);
}
