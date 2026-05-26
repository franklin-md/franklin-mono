import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

import type { ResolvedToolRender } from '@franklin/react';

import { cn } from '../../lib/cn.js';
import { Button } from '../../primitives/button.js';
import { RowDetailInset } from '../row-detail-inset.js';
import { RowInset } from '../row-inset.js';

export function ToolCardChrome({
	status,
	summary,
	expanded,
}: ResolvedToolRender) {
	const [open, setOpen] = useState(false);
	const hasExpanded = expanded != null;
	const isInProgress = status === 'in-progress';

	return (
		<div className="text-xs">
			<div
				data-status={status}
				aria-busy={isInProgress || undefined}
				className={cn(
					'rounded-md text-muted-foreground transition-colors',
					status === 'error' && 'text-destructive',
					hasExpanded &&
						(status === 'error'
							? 'hover:bg-destructive/10'
							: 'hover:bg-accent'),
				)}
			>
				<RowInset asChild>
					<Button
						type="button"
						variant="ghost"
						className={cn(
							'h-auto w-full appearance-none justify-start gap-2 rounded-md border-0 bg-transparent text-left text-xs font-normal text-current shadow-none hover:bg-transparent hover:text-current disabled:opacity-100',
							hasExpanded ? 'cursor-pointer' : 'cursor-default',
						)}
						onClick={() => hasExpanded && setOpen((o) => !o)}
						disabled={!hasExpanded}
						aria-expanded={hasExpanded ? open : undefined}
					>
						<span
							className={cn(
								'flex min-w-0 flex-1 items-center gap-1.5 text-left',
								isInProgress && 'shimmer',
							)}
						>
							{summary}
						</span>
						{hasExpanded && (
							<ChevronRight
								className={cn(
									'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-150',
									open && 'rotate-90',
								)}
							/>
						)}
					</Button>
				</RowInset>
			</div>
			{open && hasExpanded && (
				<RowDetailInset className="text-muted-foreground">
					{expanded}
				</RowDetailInset>
			)}
		</div>
	);
}
