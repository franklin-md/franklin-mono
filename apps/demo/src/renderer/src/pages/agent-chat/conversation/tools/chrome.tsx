import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

import type { ResolvedToolRender } from '@franklin/react';

import { cn } from '@/lib/utils';

import { StatusIcon } from './status-icon.js';

export function ToolCardChrome({
	status,
	summary,
	expanded,
}: ResolvedToolRender) {
	const [open, setOpen] = useState(false);
	const expandable = expanded != null;

	return (
		<div className="text-xs">
			<button
				type="button"
				className={cn(
					'flex w-full items-center gap-2 px-1 py-1',
					expandable ? 'cursor-pointer' : 'cursor-default',
				)}
				onClick={() => expandable && setOpen((o) => !o)}
				disabled={!expandable}
			>
				<StatusIcon status={status} />
				<span className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-muted-foreground">
					{summary}
				</span>
				{expandable && (
					<ChevronRight
						className={cn(
							'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-150',
							open && 'rotate-90',
						)}
					/>
				)}
			</button>
			{open && expanded && (
				<div className="px-1 pb-1 pt-0.5 text-muted-foreground">{expanded}</div>
			)}
		</div>
	);
}
