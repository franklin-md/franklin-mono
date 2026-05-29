import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/cn.js';

export type PromptContainerProps = ComponentPropsWithoutRef<'div'>;

export function PromptContainer({
	children,
	className,
	...props
}: PromptContainerProps) {
	return (
		<div className={cn('px-4 pb-4 pt-2', className)} {...props}>
			<div className="flex flex-col gap-3 overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-inset ring-input transition-colors focus-within:ring-input dark:bg-white/[0.08]">
				{children}
			</div>
		</div>
	);
}
