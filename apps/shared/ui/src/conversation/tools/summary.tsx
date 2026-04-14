import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

export interface ToolSummaryProps {
	icon: LucideIcon;
	label?: ReactNode;
	leading?: ReactNode;
	children?: ReactNode;
	labelClassName?: string;
}

export function ToolSummary({
	icon: Icon,
	label,
	leading,
	children,
	labelClassName,
}: ToolSummaryProps) {
	return (
		<>
			<Icon className="h-3 w-3 shrink-0" />
			{leading}
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
		<span className={cn('truncate text-muted-foreground/50', className)}>
			{children}
		</span>
	);
}
