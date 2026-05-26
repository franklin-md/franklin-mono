import { Check, Loader2, X } from 'lucide-react';

import { cn } from '../lib/cn.js';

export type StatusIconStatus = 'in-progress' | 'success' | 'failure' | 'error';

export type StatusIconProps = {
	status: StatusIconStatus;
	className?: string;
};

export function StatusIcon({ status, className }: StatusIconProps) {
	switch (status) {
		case 'in-progress':
			return (
				<Loader2
					aria-hidden="true"
					className={cn(
						'h-3 w-3 shrink-0 animate-spin text-muted-foreground',
						className,
					)}
				/>
			);
		case 'success':
			return (
				<Check
					aria-hidden="true"
					className={cn('h-3 w-3 shrink-0 text-emerald-500', className)}
				/>
			);
		case 'failure':
		case 'error':
			return (
				<X
					aria-hidden="true"
					className={cn('h-3 w-3 shrink-0 text-destructive', className)}
				/>
			);
	}
}
