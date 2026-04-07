import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as React from 'react';

import { cn } from '@/lib/utils';

const ScrollArea = React.forwardRef<
	React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
	<ScrollAreaPrimitive.Root
		ref={ref}
		className={cn('relative overflow-hidden', className)}
		{...props}
	>
		<ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
			{children}
		</ScrollAreaPrimitive.Viewport>
		<ScrollBar />
		<ScrollAreaPrimitive.Corner />
	</ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
	React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
	<ScrollAreaPrimitive.ScrollAreaScrollbar
		ref={ref}
		orientation={orientation}
		className={cn(
			'flex touch-none select-none transition-colors',
			orientation === 'vertical' && 'top-1.5 bottom-1.5 right-1 w-3 p-[2px]',
			orientation === 'horizontal' &&
				'bottom-1 left-1.5 right-1.5 h-3 flex-col p-[2px]',
			className,
		)}
		{...props}
	>
		<ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-ring/70 dark:bg-white/18" />
	</ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
