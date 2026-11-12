import { useEffect, useRef } from 'react';
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from '../primitives/popover.js';
import type { CompactPopoverProps } from './types.js';

export function CompactPopover({
	anchor,
	label,
	children,
	onClose,
	onContent,
}: CompactPopoverProps) {
	const content = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		const win = anchor.contextElement.ownerDocument.defaultView;
		if (!win) return;
		const handleKey = (event: KeyboardEvent) => {
			const element = content.current;
			if (
				event.defaultPrevented ||
				event.isComposing ||
				!element?.contains(element.ownerDocument.activeElement)
			)
				return;
			if (
				event.key === 'Escape' &&
				!event.altKey &&
				!event.ctrlKey &&
				!event.metaKey
			) {
				event.preventDefault();
				event.stopPropagation();
				onClose(true);
			} else if (event.key === 'Tab') {
				// Preserve native focus navigation while preventing host editor commands.
				event.stopPropagation();
			}
		};
		win.addEventListener('keydown', handleKey, true);
		return () => win.removeEventListener('keydown', handleKey, true);
	}, [anchor, onClose]);
	return (
		<Popover
			open
			onOpenChange={(open) => {
				if (!open) onClose(false);
			}}
		>
			<PopoverAnchor virtualRef={{ current: anchor }} />
			<PopoverContent
				ref={(element) => {
					content.current = element;
					onContent?.(element);
				}}
				aria-label={label}
				tabIndex={-1}
				side="top"
				align="center"
				sideOffset={6}
				collisionPadding={8}
				updatePositionStrategy="always"
				className="box-border w-max max-w-[calc(100vw-1rem)] max-h-[var(--radix-popover-content-available-height)] overflow-auto rounded-md bg-muted p-1 font-sans text-sm shadow-lg motion-reduce:animate-none"
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					(
						content.current?.querySelector<HTMLElement>(
							'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]',
						) ?? content.current
					)?.focus();
				}}
				onCloseAutoFocus={(event) => event.preventDefault()}
			>
				{children}
			</PopoverContent>
		</Popover>
	);
}
