import { Slot } from '@radix-ui/react-slot';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn.js';

export function RowInset({
	children,
	className,
	asChild = false,
}: {
	children: ReactNode;
	className?: string;
	asChild?: boolean;
}) {
	const Comp = asChild ? Slot : 'div';
	return <Comp className={cn('px-1 py-1', className)}>{children}</Comp>;
}
