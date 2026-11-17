import { useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { PopoverContent } from '../../../primitives/popover.js';
import { focusCommand } from '../../../primitives/focus-command.js';
import { cn } from '../../../lib/cn.js';

type Props = ComponentPropsWithoutRef<typeof PopoverContent>;

export function ModelPickerContent({
	className,
	onOpenAutoFocus,
	...props
}: Props) {
	const content = useRef<HTMLDivElement>(null);
	return (
		<PopoverContent
			ref={content}
			side="top"
			align="start"
			className={cn(
				'flex max-h-[var(--radix-popover-content-available-height)] w-80 max-w-[var(--radix-popover-content-available-width)] flex-col overflow-hidden p-0',
				className,
			)}
			{...props}
			onOpenAutoFocus={(event) => {
				onOpenAutoFocus?.(event);
				if (event.defaultPrevented) return;
				if (focusCommand(content.current)) {
					event.preventDefault();
				}
			}}
		/>
	);
}
