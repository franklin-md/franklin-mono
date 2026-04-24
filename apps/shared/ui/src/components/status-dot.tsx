import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../lib/cn.js';

export type StatusDotProps = ComponentPropsWithoutRef<'span'>;

export function StatusDot({ className, ...props }: StatusDotProps) {
	return (
		<span
			{...props}
			aria-hidden="true"
			className={cn(
				'size-2 shrink-0 rounded-full bg-primary transition-colors',
				className,
			)}
		/>
	);
}
