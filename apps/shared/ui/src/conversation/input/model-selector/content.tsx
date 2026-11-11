import { useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { PopoverContent } from '../../../primitives/popover.js';
import { cn } from '../../../lib/cn.js';
import { useModelPicker } from './context.js';

type Props = ComponentPropsWithoutRef<typeof PopoverContent>;

export function ModelPickerContent({
	className,
	onEscapeKeyDown,
	onOpenAutoFocus,
	...props
}: Props) {
	const { view, setView } = useModelPicker();
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
				// With no search input, focus the listbox so cmdk's existing
				// Arrow/Enter handling works without a second navigation system.
				const target =
					content.current?.querySelector<HTMLElement>('[cmdk-input]') ??
					content.current?.querySelector<HTMLElement>('[cmdk-list]');
				if (target) {
					event.preventDefault();
					target.focus();
				}
			}}
			onEscapeKeyDown={(event) => {
				onEscapeKeyDown?.(event);
				if (!event.defaultPrevented && view === 'effort') {
					event.preventDefault();
					setView('models');
				}
			}}
		/>
	);
}
