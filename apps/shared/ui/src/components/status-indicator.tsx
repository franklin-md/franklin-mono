import { Loader2 } from 'lucide-react';

import type { StatusState } from '@franklin/extensions';

import { cn } from '../lib/cn.js';

import { StatusDot } from './status-dot.js';

export type StatusIndicatorProps = {
	status: StatusState;
	className?: string;
};

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
	if (status === 'in-progress') {
		return (
			<Loader2
				aria-hidden="true"
				className={cn(
					'size-3 shrink-0 animate-spin text-muted-foreground',
					className,
				)}
			/>
		);
	}

	return (
		<span
			aria-hidden="true"
			className={cn(
				'flex size-3 shrink-0 items-center justify-center',
				status === 'idle' && 'invisible',
				className,
			)}
		>
			<StatusDot />
		</span>
	);
}
