import type { ComponentPropsWithoutRef } from 'react';
import { PopoverContent } from '../../../primitives/popover.js';
import { cn } from '../../../lib/cn.js';

type Props = ComponentPropsWithoutRef<typeof PopoverContent>;

export function ModelPickerContent({ className, ...props }: Props) {
	return (
		<PopoverContent
			side="top"
			align="start"
			className={cn(
				'flex max-h-[var(--radix-popover-content-available-height)] w-80 max-w-[var(--radix-popover-content-available-width)] flex-col overflow-hidden p-0',
				className,
			)}
			{...props}
		/>
	);
}
