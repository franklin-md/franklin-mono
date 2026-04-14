import type { ReactNode } from 'react';

import { cn } from '../lib/cn.js';

export interface TextareaGroupProps {
	textarea: ReactNode;
	buttonBar: ReactNode;
	className?: string;
}

export function TextareaGroup({
	textarea,
	buttonBar,
	className,
}: TextareaGroupProps) {
	return (
		<div
			className={cn(
				'flex flex-col gap-3 overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-inset ring-ring/70 transition-colors focus-within:ring-ring dark:bg-white/[0.08]',
				className,
			)}
		>
			{textarea}
			<div className="flex items-center justify-between pl-4 pr-3 pb-3">
				{buttonBar}
			</div>
		</div>
	);
}
