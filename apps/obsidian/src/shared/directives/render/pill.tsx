import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@franklin/ui';

const pillStyles = cva(
	'inline-flex h-auto min-h-0 shrink-0 items-center gap-1 rounded-md px-2 py-0.5 font-sans text-xs leading-none font-medium whitespace-nowrap not-italic [&_svg]:size-[0.75em] [&_svg]:shrink-0',
);

type Props = ComponentPropsWithoutRef<'span'> & { asChild?: boolean };

export const DirectivePill = forwardRef<HTMLSpanElement, Props>(
	function DirectivePill({ asChild = false, className, ...props }, ref) {
		const Surface = asChild ? Slot : 'span';
		// Let labels and font-relative icons determine one compact height. Nested
		// actions must fit the text line instead of enlarging the pill when active.
		// Slot preserves the button's semantics and the preview trigger's ref.
		// https://www.radix-ui.com/primitives/docs/utilities/slot
		return (
			<Surface ref={ref} className={cn(pillStyles(), className)} {...props} />
		);
	},
);
