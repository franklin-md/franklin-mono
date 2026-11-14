import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '../../../lib/cn.js';

type Props = ComponentPropsWithoutRef<'div'>;

export function ModelPickerFooter({ children, className, ...props }: Props) {
	return (
		<div
			className={cn('min-h-0 shrink-0 overflow-y-auto p-1', className)}
			{...props}
		>
			<div role="separator" className="-mx-1 mb-1 h-px bg-border" />
			{children}
		</div>
	);
}
