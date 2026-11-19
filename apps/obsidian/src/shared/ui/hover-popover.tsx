import type { ReactElement, ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger, cn } from '@franklin/ui';
import { useHoverPopover } from './use-hover-popover.js';

type Props = {
	trigger: ReactElement;
	label: string;
	className?: string;
	children: (close: () => void) => ReactNode;
};

// Opens above an inline trigger, such as a directive pill, on hover or focus.
export function HoverPopover({ trigger, label, className, children }: Props) {
	const popover = useHoverPopover();
	return (
		<Popover {...popover.root}>
			<PopoverTrigger asChild {...popover.trigger}>
				{trigger}
			</PopoverTrigger>
			<PopoverContent
				{...popover.content}
				aria-label={label}
				side="top"
				align="center"
				sideOffset={6}
				collisionPadding={8}
				className={cn(
					'box-border max-w-[calc(100vw-1rem)] font-sans select-text motion-reduce:animate-none',
					className,
				)}
			>
				{children(popover.close)}
			</PopoverContent>
		</Popover>
	);
}
