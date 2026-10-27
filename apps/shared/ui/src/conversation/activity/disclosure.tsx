import { useId, useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

import { cn } from '../../lib/cn.js';
import { Button } from '../../primitives/button.js';
import type { ActivityDisclosureProps } from './types.js';

export function ActivityDisclosure({
	summary,
	summaryPrefix,
	current,
	running = false,
	errors = 0,
	meta,
	children,
}: ActivityDisclosureProps) {
	const [open, setOpen] = useState(false);
	const contentId = useId();
	const chevron = (
		<ChevronRight
			aria-hidden="true"
			className={cn(
				'size-3 shrink-0 transition-transform motion-reduce:transition-none',
				open && 'rotate-90',
			)}
		/>
	);

	return (
		<div className="min-w-0 text-xs text-muted-foreground">
			<Button
				type="button"
				variant="ghost"
				className="h-8 w-full min-w-0 justify-start gap-2 border-0 bg-transparent px-1 text-left text-xs font-normal shadow-none"
				onClick={() => setOpen((value) => !value)}
				aria-expanded={open}
				aria-controls={contentId}
			>
				{running ? (
					<Loader2
						aria-hidden="true"
						className="size-3 shrink-0 animate-spin motion-reduce:animate-none"
					/>
				) : (
					chevron
				)}
				<span className="relative flex h-6 min-w-0 flex-1 items-center overflow-hidden">
					<span
						key={running ? current?.id : 'summary'}
						className={cn(
							'flex w-full min-w-0 items-center gap-1.5 overflow-hidden',
							running && 'activity-current',
						)}
					>
						{running && current ? (
							current.content
						) : (
							<>
								{!running && summaryPrefix && (
									<span
										aria-hidden="true"
										className="flex shrink-0 items-center gap-1"
									>
										{summaryPrefix}
									</span>
								)}
								<span className="truncate">{summary}</span>
							</>
						)}
					</span>
				</span>
				{errors > 0 && (
					<span className="shrink-0 text-destructive">
						{' '}
						{errors} {errors === 1 ? 'error' : 'errors'}
					</span>
				)}
				{meta && <span className="shrink-0 tabular-nums"> {meta}</span>}
				{running && chevron}
			</Button>
			<div id={contentId}>
				{open && (
					<div className="ml-2 mt-1 flex min-w-0 flex-col gap-1 rounded-md p-2 ring-1 ring-inset ring-border">
						{children}
					</div>
				)}
			</div>
		</div>
	);
}
