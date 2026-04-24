import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

import type { ResolvedToolRender } from '@franklin/react';

import { cn } from '../../lib/cn.js';
import { Button } from '../../primitives/button.js';
import { RowDetailInset } from '../row-detail-inset.js';
import { RowInset } from '../row-inset.js';

import { StatusIcon } from './status-icon.js';

export function ToolCardChrome({
	status,
	summary,
	expanded,
}: ResolvedToolRender) {
	const [open, setOpen] = useState(false);
	const hasExpanded = expanded != null;

	return (
		<div className="text-xs">
			<RowInset asChild>
				<Button
					type="button"
					variant="ghost"
					className={cn(
						'h-auto w-full appearance-none justify-start gap-2 rounded-md border-0 bg-transparent text-left text-xs font-normal text-muted-foreground shadow-none disabled:opacity-100',
						hasExpanded ? 'cursor-pointer' : 'cursor-default',
					)}
					onClick={() => hasExpanded && setOpen((o) => !o)}
					disabled={!hasExpanded}
					aria-expanded={hasExpanded ? open : undefined}
				>
					<StatusIcon status={status} />
					<span className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
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
			{open && hasExpanded && (
				<RowDetailInset className="text-muted-foreground">
					{expanded}
				</RowDetailInset>
			)}
		</div>
	);
}
