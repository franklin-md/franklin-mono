import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/cn.js';

export type PromptFooterProps = ComponentPropsWithoutRef<'div'>;

export function PromptFooter({
	children,
	className,
	...props
}: PromptFooterProps) {
	return (
		<div className={cn('pb-3 pl-4 pr-3', className)} {...props}>
			{children}
		</div>
	);
}
