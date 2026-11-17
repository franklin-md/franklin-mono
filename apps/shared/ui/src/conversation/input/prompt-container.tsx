import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/cn.js';
import { PromptSurface } from './prompt-surface.js';

export type PromptContainerProps = ComponentPropsWithoutRef<'div'>;

export function PromptContainer({
	children,
	className,
	...props
}: PromptContainerProps) {
	return (
		<div className={cn('px-4 pb-4 pt-2', className)} {...props}>
			<PromptSurface>{children}</PromptSurface>
		</div>
	);
}
