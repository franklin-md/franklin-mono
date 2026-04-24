import type { ReactNode } from 'react';

import { cn } from '../lib/cn.js';

export function RowDetailInset({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={cn('px-1 pb-1 pt-0.5', className)}>{children}</div>;
}
