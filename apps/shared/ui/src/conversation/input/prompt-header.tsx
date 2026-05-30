import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/cn.js';

export type PromptHeaderProps = ComponentPropsWithoutRef<'div'>;

export function PromptHeader({
	children,
	className,
	...props
}: PromptHeaderProps) {
	if (children == null) return null;

	return (
		<div className={cn('px-4 pt-4', className)} {...props}>
			{children}
		</div>
	);
}
