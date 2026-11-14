import { Slot } from '@radix-ui/react-slot';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../lib/cn.js';

type Props = ComponentPropsWithoutRef<'div'> & { asChild?: boolean };

export function PromptSurface({ asChild = false, className, ...props }: Props) {
	const Surface = asChild ? Slot : 'div';
	return (
		<Surface
			className={cn(
				'flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-inset ring-input dark:bg-white/[0.08]',
				className,
			)}
			{...props}
		/>
	);
}
