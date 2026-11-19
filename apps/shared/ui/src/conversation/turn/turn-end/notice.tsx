import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

import { cn } from '../../../lib/cn.js';

export interface TurnEndNoticeProps {
	tone: 'error' | 'warning';
	title: string;
	message?: string;
	actions?: ReactNode;
}

export function TurnEndNotice({
	tone,
	title,
	message,
	actions,
}: TurnEndNoticeProps) {
	return (
		<div
			role={tone === 'error' ? 'alert' : 'status'}
			className={cn(
				'flex min-w-0 flex-col gap-2 rounded-lg px-3 py-2.5 text-xs ring-1 ring-inset',
				tone === 'error'
					? 'bg-destructive/5 ring-destructive/25'
					: 'bg-amber-500/5 ring-amber-500/30',
			)}
		>
			<p
				className={cn(
					'm-0 flex items-center gap-1.5 font-medium',
					tone === 'error' ? 'text-destructive' : 'text-amber-600',
				)}
			>
				<TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
				{title}
			</p>
			{message ? (
				<p className="m-0 whitespace-pre-wrap text-muted-foreground select-text wrap-anywhere">
					{message}
				</p>
			) : null}
			{actions ? (
				<div className="flex flex-wrap items-center gap-1.5">{actions}</div>
			) : null}
		</div>
	);
}
